import {
  GROQ_RECIPE_BATCH_COUNT,
  GROQ_RECIPES_PER_BATCH,
} from "./groqConstants";
import { buildSystemPrompt, buildUserMessage } from "./groqPrompt";
import { parseRecipesPayload } from "./groqParse";
import type { GroqRecipeJson, RecipeGenerationInput } from "./groqTypes";

const GROQ_MODEL = "moonshotai/kimi-k2-instruct-0905";

/** Enough for three structured recipes without overshooting on-demand TPM. */
const GROQ_MAX_OUTPUT_TOKENS = 4096;

/** Same-origin proxy in dev (`vite.config`) and production (Vercel `api/groq.ts`). */
const GROQ_CHAT_URL = "/api/groq";

async function postGroqChat(
  apiKey: string,
  system: string,
  user: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(GROQ_CHAT_URL, {
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
        temperature: 0.65,
        max_tokens: GROQ_MAX_OUTPUT_TOKENS,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.includes("fetch") || msg === "Failed to fetch"
        ? "Netzwerkfehler. Läuft die App über den Vite-Dev-Server (npm run dev) oder eine Vercel-Deploy-URL? Direkt geöffnete dist/index.html kann keine API nutzen."
        : msg,
    );
  }

  const bodyText = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText) as unknown;
  } catch {
    const snippet = bodyText.replace(/\s+/g, " ").trim().slice(0, 280);
    throw new Error(
      `Antwort war kein JSON (HTTP ${res.status}). ${snippet ? `Anfang: ${snippet}` : "Leerer Body."}`,
    );
  }

  const raw = parsed as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    const msg = raw.error?.message ?? res.statusText;
    throw new Error(
      msg.includes("Invalid API Key") || res.status === 401
        ? "Ungültiger API-Schlüssel."
        : `Groq: ${msg || res.status}`,
    );
  }

  const content = raw.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Leere Antwort von Groq.");
  }
  return content;
}

/**
 * One request: **3** recipes (single JSON payload). No second batch — avoids doubling TPM usage.
 * @throws Error with German message on failure
 */
export async function fetchRecipesFromGroq(
  apiKey: string,
  input: RecipeGenerationInput,
): Promise<GroqRecipeJson[]> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("Kein API-Schlüssel. Bitte unter Settings eintragen.");
  }
  if (input.pantryLines.length === 0) {
    throw new Error("Wähle mindestens 1 Zutat aus.");
  }

  const system = buildSystemPrompt({ recipesPerCall: GROQ_RECIPES_PER_BATCH });
  const user = buildUserMessage(input, {
    batchIndex: 0,
    totalBatches: GROQ_RECIPE_BATCH_COUNT,
  });

  const content = await postGroqChat(trimmed, system, user);

  let recipes: GroqRecipeJson[];
  try {
    recipes = parseRecipesPayload(content, {
      maxRecipes: GROQ_RECIPES_PER_BATCH,
      minRecipes: GROQ_RECIPES_PER_BATCH,
    });
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Parsefehler";
    throw new Error(`Rezeptdaten: ${hint}`);
  }

  if (recipes.length !== GROQ_RECIPES_PER_BATCH) {
    throw new Error(
      `Erwartet ${GROQ_RECIPES_PER_BATCH} Rezepte, erhalten ${recipes.length}. Bitte erneut versuchen.`,
    );
  }
  return recipes;
}
