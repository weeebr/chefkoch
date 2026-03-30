import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateRecipeOnceWithGroqJsonSchema } from "../src/server/groqGenerateRecipe";
import { generateRecipeRequestSchema } from "../src/server/groqGenerateRecipeRequest";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-groq-api-key",
};

function writeJson(
  res: { writeHead: (status: number, headers: Record<string, string>) => void; end: (body?: string) => void },
  status: number,
  body: unknown,
): void {
  res.writeHead(status, {
    ...corsHeaders,
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

let cachedPromptSource: string | null = null;

function getPromptSource(): string {
  if (cachedPromptSource) return cachedPromptSource;
  const candidates = [
    resolve("src/features/groq/recipe-api-persona.md"),
    resolve(process.cwd(), "src/features/groq/recipe-api-persona.md"),
    resolve("/var/task/src/features/groq/recipe-api-persona.md"),
  ];
  for (const p of candidates) {
    try {
      const text = readFileSync(p, "utf-8");
      if (text.trim().length > 0) {
        cachedPromptSource = text;
        return text;
      }
    } catch {
      // Try the next candidate path.
    }
  }
  throw new Error("Prompt source file not found in runtime.");
}

export default async function handler(
  req: any,
  res: any,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  if (req.method !== "POST") {
    writeJson(res, 405, { error: { message: "Method not allowed" } });
    return;
  }

  const bodyText = await new Promise<string>((resolveBody, reject) => {
    let acc = "";
    req.on("data", (chunk: any) => {
      acc += chunk.toString("utf8");
    });
    req.on("end", () => resolveBody(acc));
    req.on("error", reject);
  });

  let payload: unknown;
  try {
    payload = bodyText.trim() ? JSON.parse(bodyText) : {};
  } catch {
    writeJson(res, 400, { error: { message: "Invalid JSON body." } });
    return;
  }

  const requestResult = generateRecipeRequestSchema.safeParse(payload);
  if (!requestResult.success) {
    const first = requestResult.error.issues[0];
    const where = first?.path?.join(".") || "body";
    const why = first?.message || "Invalid request payload.";
    writeJson(res, 400, { error: { message: `${where}: ${why}` } });
    return;
  }
  const requestData = requestResult.data;

  const apiKeyHeader = req.headers["x-groq-api-key"];
  const apiKey =
    typeof apiKeyHeader === "string"
      ? apiKeyHeader
      : Array.isArray(apiKeyHeader)
        ? apiKeyHeader[0] ?? ""
        : "";
  if (!apiKey.trim()) {
    writeJson(res, 400, {
      error: {
        message:
          "Missing x-groq-api-key header. Bitte Groq-Schlüssel in Settings setzen.",
      },
    });
    return;
  }

  try {
    const promptSource = getPromptSource();
    const result = await generateRecipeOnceWithGroqJsonSchema(
      apiKey,
      {
        pantryLines: requestData.pantryLines,
        willingToShop: requestData.willingToShop,
        strictUseAllSelected: requestData.strictUseAllSelected,
        regionLabel: requestData.regionLabel,
        previousRecipeTitles: requestData.previousRecipeTitles,
        previousRecipeHints: requestData.previousRecipeHints,
        generationIndex: requestData.generationIndex,
        totalRecipesToGenerate: requestData.totalRecipesToGenerate,
      },
      promptSource,
    );
    writeJson(res, 200, result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq generation failed.";
    const status = /Prompt source file not found/i.test(msg) ? 500 : 400;
    writeJson(res, status, { error: { message: msg } });
  }
}
