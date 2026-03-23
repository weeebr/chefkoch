/** Same rules as Groq policy matching: case, accents (NFD strip), whitespace. */
export function normalizeIngredientLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}
