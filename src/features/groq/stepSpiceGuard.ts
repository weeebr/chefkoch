/**
 * Step text sanitization: ensures spice/herb mentions in steps are backed by ingredient lists.
 * OWNERSHIP: backend post-fetch pipeline only.
 * FORBIDDEN: client-side import or usage.
 */
import { parseRequiredBaseStaplesFromGroq } from "../../data/basePantry.js";
import { normalizeIngredientLabel } from "../../data/ingredientLabel.js";
import type { GroqIngredientLine, GroqRecipeJson } from "./groqTypes";

function normalizedIngredientKey(component: string): string {
  const base = component.split(/[,(]/)[0]?.trim() ?? component.trim();
  return normalizeIngredientLabel(base);
}

function collectAllowedNormKeys(j: GroqRecipeJson): Set<string> {
  const out = new Set<string>();
  const add = (raw: string) => {
    const k = normalizedIngredientKey(raw);
    if (k.length > 0) out.add(k);
  };
  for (const rows of [j.ingredientsOnHand, j.ingredientsShopping, j.spices] as (
    | GroqIngredientLine[]
    | undefined
  )[]) {
    for (const r of rows ?? []) {
      if (typeof r?.component === "string" && r.component.trim()) add(r.component);
    }
  }
  for (const s of parseRequiredBaseStaplesFromGroq(j.requiredBaseStaples)) {
    add(s);
  }
  return out;
}

/**
 * A mentioned spice/herb phrase is allowed only if it is backed by the JSON:
 * ingredientsOnHand / ingredientsShopping / spices components, or requiredBaseStaples.
 */
function mentionAllowed(mentionNorm: string, allowed: Set<string>): boolean {
  if (allowed.has(mentionNorm)) return true;
  for (const a of allowed) {
    if (a.includes(mentionNorm) && mentionNorm.length >= 4) return true;
    if (mentionNorm.includes(a) && a.length >= 10) return true;
  }
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * German Gewürze/Kräuter (and common pastes) that often appear in steps without a JSON line.
 * Longer / multi-word phrases first so regex matches the specific form.
 * Avoid lone "Paprika"/"Curry" (dish vs powder ambiguity).
 */
const GUARDED_SPICE_PHRASES: readonly string[] = [
  "Garam Masala",
  "Worcestersauce",
  "Knoblauchpulver",
  "Zwiebelpulver",
  "Ingwerpulver",
  "Vanillezucker",
  "Vanillepulver",
  "Tomatenmark",
  "Tomatenpüree",
  "Chiliflocken",
  "Korianderpulver",
  "Paprikapulver",
  "Rauchpaprika",
  "Lorbeerblätter",
  "Lorbeerblatt",
  "Currypulver",
  "Liebstöckel",
  "Muskatblüte",
  "Muskatnuss",
  "Nelkenpulver",
  "Fenchelsamen",
  "Sternanis",
  "Kreuzkümmel",
  "Currypaste",
  "Grillgewürz",
  "Chilipulver",
  "Koriandergrün",
  "Schnittlauch",
  "Bohnenkraut",
  "Rosmarin",
  "Majoran",
  "Estragon",
  "Kerbel",
  "Kardamom",
  "Petersilie",
  "Koriander",
  "Thymian",
  "Oregano",
  "Basilikum",
  "Salbei",
  "Dill",
  "Minze",
  "Lorbeer",
  "Piment",
  "Nelken",
  "Zimtpulver",
  "Berbere",
  "Sumach",
  "Zimt",
  "Muskat",
  "Safran",
  "Vanille",
  "Brühwürfel",
  "Fischsauce",
  "Sojasauce",
  "Tabasco",
  "Harissa",
  "Sambal Oelek",
  "Sriracha",
];

const STEP_SPICE_PATTERN: RegExp = (() => {
  const sorted = [...GUARDED_SPICE_PHRASES].sort((a, b) => b.length - a.length);
  const inner = sorted
    .map((phrase) => {
      const parts = phrase.split(/\s+/).map(escapeRegExp);
      return `\\b${parts.join("\\s+")}\\b`;
    })
    .join("|");
  return new RegExp(inner, "giu");
})();

export function sanitizeStepSpiceMentions(j: GroqRecipeJson, text: string): string {
  const allowed = collectAllowedNormKeys(j);
  return text.replace(STEP_SPICE_PATTERN, (full) => {
    const key = normalizeIngredientLabel(full);
    if (key.length === 0) return full;
    if (mentionAllowed(key, allowed)) return full;
    return "";
  });
}

export function collapseStepWhitespace(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/^\s*[.,;]\s*/g, "")
    .trim();
}
