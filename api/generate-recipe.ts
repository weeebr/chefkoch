import { generateRecipeOnceWithGroqJsonSchema } from "../src/server/groqGenerateRecipe";
import { generateRecipeRequestSchema } from "../src/server/groqGenerateRecipeRequest";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-groq-api-key",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * One-shot recipe generation endpoint:
 * - Groq structured outputs via `response_format: json_schema`
 * - validated once with Zod on the backend
 */
export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST")
    return jsonResponse(405, { error: { message: "Method not allowed" } });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: { message: "Invalid JSON body." } });
  }

  const requestResult = generateRecipeRequestSchema.safeParse(payload);
  if (!requestResult.success) {
    const first = requestResult.error.issues[0];
    const where = first?.path?.join(".") || "body";
    const why = first?.message || "Invalid request payload.";
    return jsonResponse(400, { error: { message: `${where}: ${why}` } });
  }
  const requestData = requestResult.data;

  const apiKey = request.headers.get("x-groq-api-key") ?? "";
  if (!apiKey.trim()) {
    return jsonResponse(400, {
      error: {
        message:
          "Missing x-groq-api-key header. Bitte Groq-Schlüssel in Settings setzen.",
      },
    });
  }

  try {
    const recipeResult = await generateRecipeOnceWithGroqJsonSchema(apiKey, {
      pantryLines: requestData.pantryLines,
      willingToShop: requestData.willingToShop,
      regionLabel: requestData.regionLabel,
      previousRecipeTitles: requestData.previousRecipeTitles,
      previousRecipeHints: requestData.previousRecipeHints,
      generationIndex: requestData.generationIndex,
      totalRecipesToGenerate: requestData.totalRecipesToGenerate,
    });

    return jsonResponse(200, {
      recipe: recipeResult.recipe,
      totalTokens: recipeResult.totalTokens,
      finishReason: recipeResult.finishReason,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq generation failed.";
    return jsonResponse(400, { error: { message: msg } });
  }
}
