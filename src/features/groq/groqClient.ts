import { recordGroqApiUsage } from "./groqTpmMinuteStore";
import type { GeneratedRecipeResult } from "./groqTypes";
import type { RecipeGenerationInput } from "./groqTypes";

export async function fetchRecipeFromGroqOnce(
  apiKey: string,
  input: RecipeGenerationInput,
  opts: {
    generationIndex: number;
    totalRecipesToGenerate: number;
  },
): Promise<GeneratedRecipeResult> {
  if (input.pantryLines.length === 0) {
    throw new Error("Wähle mindestens 1 Zutat aus.");
  }

  let res: Response;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey.trim()) headers["x-groq-api-key"] = apiKey.trim();
    res = await fetch("/api/generate-recipe", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...input,
        generationIndex: opts.generationIndex,
        totalRecipesToGenerate: opts.totalRecipesToGenerate,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      msg.includes("fetch") || msg === "Failed to fetch"
        ? "Netzwerkfehler. Läuft die App über den Vite-Dev-Server (npm run dev) oder eine Vercel-Deploy-URL?"
        : msg,
    );
  }

  const bodyText = await res.text();
  let parsed: unknown;
  try {
    parsed = bodyText.trim() ? (JSON.parse(bodyText) as unknown) : {};
  } catch {
    throw new Error(`Antwort war kein JSON (HTTP ${res.status}).`);
  }

  const raw = parsed as Partial<{ error: { message?: string } }> &
    Partial<GeneratedRecipeResult>;
  if (!res.ok) {
    const msg = raw.error?.message ?? res.statusText;
    throw new Error(msg);
  }

  if (!raw.id || !raw.detail || typeof raw.detail !== "object" || !raw.listRow) {
    throw new Error("Ungültige Antwort: unvollständiges Ergebnis.");
  }

  if (raw.totalTokens != null) {
    console.info(
      `[groq] request ${opts.generationIndex + 1}/${opts.totalRecipesToGenerate}: total_tokens=${raw.totalTokens}, finish_reason=${raw.finishReason ?? "?"}`,
    );
  } else {
    console.info(
      `[groq] request ${opts.generationIndex + 1}/${opts.totalRecipesToGenerate}: total_tokens missing, finish_reason=${raw.finishReason ?? "?"}`,
    );
  }
  recordGroqApiUsage(Date.now(), raw.totalTokens);

  return raw as GeneratedRecipeResult;
}
