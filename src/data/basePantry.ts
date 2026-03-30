import { normalizeIngredientLabel } from "./ingredientLabel.js";

/** Canonical base staples (implicit pantry); never shown in Einkaufen/Zutaten tables. */
export const BASE_STAPLE_DISPLAY_NAMES = [
  "Salz",
  "Pfeffer",
  "Öl",
  "Mehl",
  "Zucker",
  "Pasta",
  "Reis",
  "Butter",
  "Milch",
] as const;

const NORMALIZED_TO_DISPLAY = new Map<string, string>();
for (const name of BASE_STAPLE_DISPLAY_NAMES) {
  NORMALIZED_TO_DISPLAY.set(normalizeIngredientLabel(name), name);
}

/** True when `normalizedKey` is the normalized label of a base staple. */
export function isBaseStapleNormalizedKey(normalizedKey: string): boolean {
  return NORMALIZED_TO_DISPLAY.has(normalizedKey);
}

/** Map a raw component string to canonical display name if it is a base staple; otherwise null. */
export function baseStapleDisplayNameFromComponent(component: string): string | null {
  const first = component.split(/[,(]/)[0]?.trim() ?? component.trim();
  const key = normalizeIngredientLabel(first);
  if (!key) return null;
  return NORMALIZED_TO_DISPLAY.get(key) ?? null;
}

/**
 * Validates and dedupes model output: only allowed staples, stable order as in BASE_STAPLE_DISPLAY_NAMES.
 */
export function parseRequiredBaseStaplesFromGroq(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const canonical = baseStapleDisplayNameFromComponent(item);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  const order = new Map<string, number>(
    BASE_STAPLE_DISPLAY_NAMES.map((n, i) => [n, i]),
  );
  return out.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}
