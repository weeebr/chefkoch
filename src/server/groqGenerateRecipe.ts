/**
 * Backend recipe generation: prompt boundary + trust-boundary validation +
 * single sanitization/mapping pass. Returns fully typed data to the client.
 * OWNERSHIP: generation, validation, sanitization, mapping (all backend-only).
 */
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "../features/groq/groqPrompt";
import type {
  GeneratedRecipeResult,
  RecipeGenerationPantryLine,
} from "../features/groq/groqTypes";
import { randomUUID } from "node:crypto";
import {
  groqRecipeContractSchema,
  getGroqRecipeJsonSchema,
} from "./groqRecipeContractSchema";
import { normalizeGroqRecipeForPolicy } from "../features/groq/groqPolicy";
import {
  groqJsonToRecipeDetail,
  groqJsonToListRow,
  groqJsonToTag,
} from "../features/groq/groqMap";
import {
  collapseStepWhitespace,
  sanitizeStepSpiceMentions,
} from "../features/groq/stepSpiceGuard";
import {
  normalizeGroqRecipeJsonForBackendSanitization,
} from "../features/groq/swissDisplayText";

const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

type GenerateRecipeRequest = {
  pantryLines: RecipeGenerationPantryLine[];
  willingToShop: boolean;
  regionLabel: string;
  previousRecipeTitles?: string[];
  previousRecipeHints?: Array<{
    title: string;
    tag?: string;
    equipmentNote?: string;
    flavorNote?: string;
  }>;
  generationIndex: number;
  totalRecipesToGenerate: number;
};

type GroqChatCompletionResponse = {
  usage?: { total_tokens?: unknown };
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null } | null;
  }>;
  error?: { message?: unknown; type?: unknown; code?: unknown } | unknown;
};

function extractFinishReason(
  raw: GroqChatCompletionResponse,
): string | undefined {
  const fr = raw.choices?.[0]?.finish_reason;
  return typeof fr === "string" ? fr : undefined;
}

function extractContent(raw: GroqChatCompletionResponse): string | undefined {
  const c = raw.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : undefined;
}

function extractTotalTokens(
  raw: GroqChatCompletionResponse,
): number | undefined {
  const t = raw.usage?.total_tokens;
  if (typeof t === "number" && Number.isFinite(t) && t > 0) return t;
  return undefined;
}

async function postGroqChatStructured(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ raw: GroqChatCompletionResponse; content?: string }> {
  const jsonSchema = getGroqRecipeJsonSchema();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.35,
      max_tokens: 12_000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "GroqRecipe",
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  const bodyText = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText) as GroqChatCompletionResponse;
  } catch {
    throw new Error(`Groq antwortete kein JSON (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const finishReason = extractFinishReason(
      parsed as GroqChatCompletionResponse,
    );
    const content = extractContent(parsed as GroqChatCompletionResponse);
    const snippet = content?.replace(/\s+/g, " ").trim().slice(0, 300) ?? "";
    const err = (parsed as GroqChatCompletionResponse).error;
    const errMsg =
      err && typeof err === "object" && "message" in err
        ? (err as { message?: unknown }).message
        : undefined;
    const errText = typeof errMsg === "string" ? errMsg : res.statusText;
    throw new Error(
      `Groq request failed (HTTP ${res.status}). finish_reason=${finishReason ?? "?"}. ${errText}${
        snippet ? `; Anfang: ${snippet}` : ""
      }`,
    );
  }

  return {
    raw: parsed as GroqChatCompletionResponse,
    content: extractContent(parsed as GroqChatCompletionResponse),
  };
}

/**
 * Full generation pipeline:
 *   prompt build -> Groq call -> Zod parse once -> sanitize once -> map once
 *
 * @param promptSource  Raw content of recipe-api-persona.md (canonical prompt).
 *                      Callers read the file using their platform's mechanism
 *                      (readFileSync in Node / bundled in edge).
 */
export async function generateRecipeOnceWithGroqJsonSchema(
  apiKey: string,
  req: GenerateRecipeRequest,
  promptSource: string,
): Promise<GeneratedRecipeResult> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error("Fehlender GROQ_API_KEY (Server).");

  const system = buildSystemPrompt(promptSource, req.willingToShop);
  const user = buildUserPrompt(
    {
      pantryLines: req.pantryLines,
      willingToShop: req.willingToShop,
      regionLabel: req.regionLabel,
      previousRecipeTitles: req.previousRecipeTitles,
      previousRecipeHints: req.previousRecipeHints,
    },
    {
      batchIndex: req.generationIndex,
      totalBatches: req.totalRecipesToGenerate,
      recipesPerCall: 1,
    },
  );

  const { raw } = await postGroqChatStructured(trimmedKey, system, user);

  const finishReason = extractFinishReason(raw);
  const content = extractContent(raw);
  if (!content || typeof content !== "string") {
    throw new Error("Leere Antwort von Groq.");
  }

  // --- Trust boundary: parse + validate exactly once ---
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error(
      `Antwort war kein gültiges JSON (finish_reason=${finishReason ?? "?"}).`,
    );
  }

  const result = groqRecipeContractSchema.safeParse(parsedJson);
  if (!result.success) {
    const first = result.error.issues[0];
    const issue = first
      ? `${first.path.join(".")}: ${first.message}`
      : "validation failed";
    throw new Error(
      `Zod validation failed (finish_reason=${finishReason ?? "?"}): ${issue}`,
    );
  }

  // --- Single sanitization + mapping pass (immediately after validation) ---
  const allowedPantryNames = req.pantryLines.map((p) => p.name);
  const policyEnforced = normalizeGroqRecipeForPolicy(
    result.data,
    req.willingToShop,
    allowedPantryNames,
  );

  // --- Single sanitization pass (step guard + Swiss orthography) ---
  const swissNormalized = normalizeGroqRecipeJsonForBackendSanitization(
    policyEnforced,
  );
  const steps = (swissNormalized.steps ?? []).map((s) => {
    const rawTitle = s.title;
    const rawBody = s.body;

    const title = collapseStepWhitespace(
      sanitizeStepSpiceMentions(swissNormalized, rawTitle),
    );
    const body = collapseStepWhitespace(
      sanitizeStepSpiceMentions(swissNormalized, rawBody),
    );

    return {
      ...s,
      title: title || rawTitle,
      body: body || rawBody,
    };
  });

  const sanitizedForMapping = {
    ...swissNormalized,
    steps,
  };

  const id = randomUUID();
  const detail = groqJsonToRecipeDetail(id, sanitizedForMapping);
  const listRow = groqJsonToListRow(id, sanitizedForMapping);
  const tag = groqJsonToTag(sanitizedForMapping);
  const totalTokens = extractTotalTokens(raw);

  return { id, detail, listRow, tag, totalTokens, finishReason };
}
