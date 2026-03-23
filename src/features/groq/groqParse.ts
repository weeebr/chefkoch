import type { GroqRecipeJson } from "./groqTypes";

/** Markdown code fences anywhere in the text (model often adds prose before ```json). */
function collectFencedBlocks(text: string): string[] {
  const out: string[] = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const block = m[1]?.trim();
    if (block) out.push(block);
  }
  return out;
}

/**
 * First top-level `{ ... }` with string-aware scanning (handles `"` and escapes).
 */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Back-compat: whole-string or first fence (prefer `collectFencedBlocks` + candidates). */
export function stripJsonFence(text: string): string {
  const t = text.trim();
  const blocks = collectFencedBlocks(t);
  if (blocks.length > 0) return blocks[0];
  return t;
}

function repairJsonForCommonLLMOutputIssues(s: string): string {
  // Common issue: trailing commas like `{"a":[1,2,], "b":3}`
  // or `[{"x":1,},]`
  return s
    .trim()
    // remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, "$1");
}

function candidateJsonStrings(content: string): string[] {
  const t = content.trim();
  const seen = new Set<string>();
  const add = (s: string | null | undefined) => {
    if (!s) return;
    const x = s.trim();
    if (x.length === 0) return;
    if (seen.has(x)) return;
    seen.add(x);
  };
  for (const b of collectFencedBlocks(t)) add(b);
  add(extractFirstJsonObject(t));
  add(t);
  return [...seen];
}

export type ParseRecipesPayloadOptions = {
  /** Cap after filtering (default 3). */
  maxRecipes?: number;
  /** Minimum valid recipes or error (default 1). */
  minRecipes?: number;
};

export function parseRecipesPayload(
  content: string,
  opts?: ParseRecipesPayloadOptions,
): GroqRecipeJson[] {
  const maxRecipes = opts?.maxRecipes ?? 3;
  const minRecipes = opts?.minRecipes ?? 1;

  let o: Record<string, unknown>;
  const tryParse = (): Record<string, unknown> => {
    const candidates = candidateJsonStrings(content);
    let lastErr: unknown;
    let lastCandidate: string | null = null;
    for (const c of candidates) {
      lastCandidate = c;
      try {
        const raw = JSON.parse(c) as unknown;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          lastErr = new Error("kein Objekt");
          continue;
        }
        return raw as Record<string, unknown>;
      } catch (e) {
        lastErr = e;
        // Try a small repair pass (e.g., trailing commas) before giving up.
        try {
          const repaired = repairJsonForCommonLLMOutputIssues(c);
          if (repaired !== c) {
            const raw = JSON.parse(repaired) as unknown;
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
              lastErr = new Error("kein Objekt");
              continue;
            }
            return raw as Record<string, unknown>;
          }
        } catch (e2) {
          lastErr = e2;
        }
      }
    }
    const hint =
      lastErr instanceof Error ? lastErr.message : String(lastErr);
    const snippet = (lastCandidate ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    throw new Error(`kein gültiges JSON (${hint}). ${snippet ? `Anfang: ${snippet}` : ""}`);
  };
  try {
    o = tryParse();
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Parsefehler";
    throw new Error(`Ungültige Antwort: ${hint}`);
  }

  if (Array.isArray(o.recipes)) {
    const list = o.recipes.filter(
      (r): r is GroqRecipeJson =>
        !!r &&
        typeof r === "object" &&
        typeof (r as GroqRecipeJson).title === "string" &&
        (r as GroqRecipeJson).title.trim().length > 0,
    ) as GroqRecipeJson[];
    if (list.length < minRecipes) {
      throw new Error(
        `Ungültige Antwort: mindestens ${minRecipes} Rezept(e) erwartet, erhalten ${list.length}.`,
      );
    }
    return list.slice(0, maxRecipes);
  }

  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (title) {
    if (minRecipes > 1) {
      throw new Error("Ungültige Antwort: Einzelrezept, aber Batch erwartet.");
    }
    return [o as GroqRecipeJson];
  }
  throw new Error("Ungültige Antwort: weder recipes noch title.");
}
