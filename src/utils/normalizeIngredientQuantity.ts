/**
 * Collapses vague size-only phrases after a leading amount (e.g. "1 kleine", "2 Bund")
 * to just the numeric part, while preserving real measurement units (ml, EL, g, …).
 */

const NON_AMOUNT = /^(–|—|-|…|\.\.\.|n\.\s*b\.|n\.b\.)$/i;

/** If present anywhere after the leading number, keep the full quantity string. */
const UNIT_OR_MEASURE = new RegExp(
  [
    "\\b(?:ml|cl|dl|l|Liter|g|kg|mg)\\b",
    "\\b(?:EL|TL|Esslöffel|Teelöffel)\\b",
    "\\b(?:Prise|Prisen)\\b",
    "\\b(?:Pkg|Packung|Dose|Glas|Tube)\\b",
    "\\b(?:Scheibe|Scheiben|Tassen?|Becher)\\b",
    "\\b(?:Zweige?|Zehe|Zehen|Blatt|Stängel)\\b",
    "\\b(?:Msp\\.?|Spritzer)\\b",
    "\\b(?:Min\\.|cm|mm)\\b",
    "°C|°",
    "\\/",
    "¼|½|¾",
  ].join("|"),
  "i",
);

/** Words that are only size / packaging words without a measure (collapse to the number). */
const VAGUE_ONLY = new Set([
  "kleine",
  "kleiner",
  "kleines",
  "klein",
  "große",
  "großer",
  "großes",
  "groß",
  "mittlere",
  "mittlerer",
  "mittel",
  "mini",
  "minis",
  "bund",
  "bünde",
  "dünne",
  "dünner",
  "dicke",
  "dicker",
  "halbe",
  "halber",
  "halbes",
  "ganze",
  "ganzer",
  "ganzes",
  "portion",
  "portionen",
  "handvoll",
]);

/**
 * If the quantity is a leading decimal amount followed only by vague descriptors, returns
 * only that amount (e.g. "1 kleine" → "1", "2 Bund" → "2"). Keeps strings that contain
 * real units or other structure (ranges, fractions, "ca.", …).
 */
export function normalizeIngredientQuantityText(raw: string): string {
  const q = raw.trim();
  if (!q || NON_AMOUNT.test(q)) return raw;

  // Leave ranges, ca., fractions at start, etc.
  if (/^(ca\.|circa|etwa|max\.|min\.|je|bis)\s/i.test(q)) return raw;
  if (/^\d+\s*[-–]\s*\d+/.test(q)) return raw;
  if (/^\d+\s*\/\s*\d+/.test(q)) return raw;

  const m = q.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!m) return raw;

  const num = m[1] ?? "";
  const rest = (m[2] ?? "").trim();
  if (!rest) return raw;

  if (UNIT_OR_MEASURE.test(rest)) return raw;

  const words = rest.split(/\s+/).filter(Boolean);
  if (words.length === 0) return num;

  const allVague = words.every((w) =>
    VAGUE_ONLY.has(w.replace(/[.,;:!?]+$/g, "").toLowerCase()),
  );
  if (!allVague) return raw;

  return num;
}
