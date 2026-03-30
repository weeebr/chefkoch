/**
 * Swiss-German orthography normalization for Groq model output.
 * OWNERSHIP: backend post-fetch pipeline only.
 * FORBIDDEN: client-side or storage-layer import/usage.
 */
import type { RecipeDetail, RecipeListRow } from "../../types";
import { normalizeIngredientQuantityText } from "../../utils/normalizeIngredientQuantity.js";
import type { GroqIngredientLine, GroqRecipeJson, GroqStepLine } from "./groqTypes";

/** Swiss-style orthography: no Eszett (U+00DF); normalize to `ss`. */
export function normalizeSwissGroqText(s: string): string {
  return normalizeSwissOrthography(s);
}

/**
 * Normalizes common German fallback spellings to Swiss/German umlauts in text values.
 * Heuristic: convert ae/oe/ue only in umlaut-like contexts:
 * - previous char is start-of-word or a non-vowel
 * - next char is non-vowel or word end
 * Also keep "qu..." intact and avoid turning "...eue..." into "...eü...".
 */
function normalizeSwissOrthography(s: string): string {
  const noEszett = s.replace(/\u00df/g, "ss");
  return noEszett
    .replace(
      /([AOUaou])e(?=($|[^aeiouyäöüAEIOUYÄÖÜ]))/g,
      (m, p1: string, _next: unknown, offset: number, full: string) => {
        const prev = offset > 0 ? full[offset - 1] : "";
        const prevIsVowel = /[aeiouyäöüAEIOUYÄÖÜ]/.test(prev);
        // Avoid over-eager replacements in patterns like "...euen" (e.g. bestreuen -> bestreuen, not bestreün).
        if (prevIsVowel) return m;
        // Preserve "qu..." sequences.
        if (prev === "q" || prev === "Q") return m;
        return p1 === p1.toUpperCase() ? umlautUpper(p1) : umlautLower(p1);
      },
    );
}

function umlautLower(base: string): string {
  if (base === "a") return "ä";
  if (base === "o") return "ö";
  return "ü";
}

function umlautUpper(base: string): string {
  if (base === "A") return "Ä";
  if (base === "O") return "Ö";
  return "Ü";
}

/** Fixed UI labels for scaling mode ids (persisted details may still carry older labels). */
export function canonicalScalingModeLabel(id: string, label: string): string {
  if (id === "percent") return "%";
  if (id === "portions") return "Portionen";
  return normalizeSwissGroqText(label);
}

/** Single pipeline step: normalize all Groq-sourced display strings on a recipe detail. */
export function normalizeGroqRecipeDetail(d: RecipeDetail): RecipeDetail {
  return {
    ...d,
    title: normalizeSwissGroqText(d.title),
    scalingModes: d.scalingModes.map((m) => ({
      ...m,
      label: canonicalScalingModeLabel(m.id, m.label),
    })),
    ingredients: d.ingredients.map((row) => ({
      component: normalizeSwissGroqText(row.component),
      quantity: normalizeIngredientQuantityText(normalizeSwissGroqText(row.quantity)),
    })),
    requiredBaseStaples: d.requiredBaseStaples.map((s) => normalizeSwissGroqText(s)),
    spices: d.spices.map((row) => ({
      component: normalizeSwissGroqText(row.component),
      quantity: normalizeIngredientQuantityText(normalizeSwissGroqText(row.quantity)),
    })),
    steps: d.steps.map((step) => ({
      ...step,
      title: normalizeSwissGroqText(step.title),
      body: normalizeSwissGroqText(step.body),
    })),
    cleanupNote:
      d.cleanupNote !== undefined ? normalizeSwissGroqText(d.cleanupNote) : undefined,
    shoppingHints:
      d.shoppingHints !== undefined ? normalizeSwissGroqText(d.shoppingHints) : undefined,
    equipmentNote:
      d.equipmentNote !== undefined ? normalizeSwissGroqText(d.equipmentNote) : undefined,
    optionalUpgradeNote:
      d.optionalUpgradeNote !== undefined
        ? normalizeSwissGroqText(d.optionalUpgradeNote)
        : undefined,
    nutritionNote:
      d.nutritionNote !== undefined ? normalizeSwissGroqText(d.nutritionNote) : undefined,
    flavorSummaryNote:
      d.flavorSummaryNote !== undefined
        ? normalizeSwissGroqText(d.flavorSummaryNote)
        : undefined,
    shoppingAlternativesNote:
      d.shoppingAlternativesNote !== undefined
        ? normalizeSwissGroqText(d.shoppingAlternativesNote)
        : undefined,
    lastUpdatedLabel: normalizeSwissGroqText(d.lastUpdatedLabel),
  };
}

export function normalizeGroqListRow(r: RecipeListRow): RecipeListRow {
  return { ...r, title: normalizeSwissGroqText(r.title) };
}

/**
 * Backend-only sanitization of Groq model output.
 * OWNERSHIP: backend post-fetch pipeline only.
 * FORBIDDEN: client/storage usage; mappers must not re-normalize.
 */
export function normalizeGroqRecipeJsonForBackendSanitization(
  j: GroqRecipeJson,
): GroqRecipeJson {
  const normMaybe = (s: unknown): string | undefined =>
    typeof s === "string" ? normalizeSwissGroqText(s) : undefined;

  const normQty = (s: unknown): string => {
    const raw = typeof s === "string" ? s : "";
    return normalizeIngredientQuantityText(normalizeSwissGroqText(raw));
  };

  const normIngredient = (r: GroqIngredientLine): GroqIngredientLine => ({
    ...r,
    component:
      typeof r.component === "string" ? normalizeSwissGroqText(r.component) : r.component,
    quantity: typeof r.quantity === "string" ? normQty(r.quantity) : r.quantity,
    alternatives: normMaybe(r.alternatives),
    purchaseHint: normMaybe(r.purchaseHint),
    flavorNote: normMaybe(r.flavorNote),
  });

  const normStep = (s: GroqStepLine): GroqStepLine => ({
    ...s,
    title: normalizeSwissGroqText(s.title),
    body: normalizeSwissGroqText(s.body),
  });

  return {
    ...j,
    title: normalizeSwissGroqText(j.title),
    tag: typeof j.tag === "string" ? normalizeSwissGroqText(j.tag) : j.tag,
    requiredBaseStaples: j.requiredBaseStaples.map((s) => normalizeSwissGroqText(s)),
    equipmentNote: normMaybe(j.equipmentNote) ?? j.equipmentNote,
    nutritionNote: normMaybe(j.nutritionNote) ?? j.nutritionNote,
    optionalUpgradeNote: normMaybe(j.optionalUpgradeNote) ?? j.optionalUpgradeNote,
    shoppingHints: normMaybe(j.shoppingHints) ?? j.shoppingHints,
    dishwasherTip: normMaybe(j.dishwasherTip) ?? j.dishwasherTip,
    ingredientsOnHand:
      j.ingredientsOnHand === undefined
        ? undefined
        : j.ingredientsOnHand.map(normIngredient),
    ingredientsShopping:
      j.ingredientsShopping === undefined
        ? undefined
        : j.ingredientsShopping.map(normIngredient),
    spices: j.spices.map(normIngredient),
    steps: (j.steps ?? []).map(normStep),
  };
}
