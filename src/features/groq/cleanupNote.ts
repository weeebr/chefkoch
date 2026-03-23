/**
 * Minimal guard: empty/whitespace and trivially short strings.
 * What counts as a **meaningful** Abwasch-/Ordnungshinweis is defined in the system
 * prompt (`recipe-api-persona.md` + technical appendix), not here.
 */

const MIN_CHARS = 12;

export function cleanupNoteFromGroq(raw: string | undefined): string | undefined {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (t.length < MIN_CHARS) return undefined;
  if (/^[\s—\-•.]+$/.test(t)) return undefined;
  return t;
}
