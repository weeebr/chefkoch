import type { RecipeDetail, RecipeIngredientRow, RecipeListRow, RecipeMethodStep } from "../../types";
import { cleanupNoteFromGroq } from "./cleanupNote";
import type { GroqIngredientLine, GroqRecipeJson, GroqStepLine } from "./groqTypes";
import { normalizeGroqListRow, normalizeGroqRecipeDetail, normalizeSwissGroqText } from "./swissDisplayText";

/** Derive prep / cook / total from model fields without inventing fixed defaults. */
export function resolveRecipeTimes(j: GroqRecipeJson): {
  prep: number;
  cook: number;
  total: number;
} {
  const p =
    typeof j.prepMinutes === "number" && !Number.isNaN(j.prepMinutes)
      ? Math.max(0, Math.round(j.prepMinutes))
      : NaN;
  const c =
    typeof j.cookMinutes === "number" && !Number.isNaN(j.cookMinutes)
      ? Math.max(0, Math.round(j.cookMinutes))
      : NaN;
  const m =
    typeof j.minutes === "number" && !Number.isNaN(j.minutes)
      ? Math.max(0, Math.round(j.minutes))
      : NaN;
  if (!Number.isNaN(p) && !Number.isNaN(c)) {
    return { prep: p, cook: c, total: p + c };
  }
  if (!Number.isNaN(m)) {
    const prep = Math.round(m * 0.35);
    const cook = Math.max(0, m - prep);
    return { prep, cook, total: m };
  }
  return { prep: 0, cook: 0, total: 0 };
}

/** Skip pseudo-rows the model sometimes emits as ingredients. */
function isIngredientHeaderRow(component: string): boolean {
  const c = component.trim().toLowerCase();
  if (!c) return true;
  return (
    /^schon vorhanden/i.test(c) ||
    /^einkauf\s*(\/\s*optional)?$/i.test(c) ||
    /^✅\s*schon/i.test(component) ||
    /^🛒/.test(component)
  );
}

function quantityFromGroqLine(r: GroqIngredientLine): string {
  if (typeof r?.quantity === "string" && r.quantity.trim()) return r.quantity.trim();
  return "";
}

function flavorNoteFromGroqLine(r: GroqIngredientLine): string {
  if (typeof r?.flavorNote === "string" && r.flavorNote.trim()) return r.flavorNote.trim();
  return "";
}

function mapIngredientsFromGroq(j: GroqRecipeJson): RecipeIngredientRow[] {
  const onHand = j.ingredientsOnHand;
  const shop = j.ingredientsShopping;

  const rows: RecipeIngredientRow[] = [];

  const pushLine = (r: GroqIngredientLine) => {
    const c =
      typeof r?.component === "string" && r.component.trim()
        ? r.component.trim()
        : "—";
    if (isIngredientHeaderRow(c)) return;
    rows.push({
      component: c,
      quantity: quantityFromGroqLine(r) || "—",
    });
  };

  if (Array.isArray(onHand) && onHand.length > 0) {
    for (const r of onHand) pushLine(r);
  }
  if (Array.isArray(shop) && shop.length > 0) {
    for (const r of shop) pushLine(r);
  }
  return rows.length > 0 ? rows : [{ component: "—", quantity: "—" }];
}

function buildFlavorSummaryNote(j: GroqRecipeJson): string | undefined {
  const notes: string[] = [];
  const push = (n: unknown) => {
    if (typeof n !== "string") return;
    const trimmed = n.trim();
    if (!trimmed) return;
    const short = trimmed.split(/[.;,]/)[0]?.trim() ?? "";
    if (!short || short.length > 60) return;
    if (!notes.some((x) => x.toLowerCase() === short.toLowerCase())) notes.push(short);
  };

  for (const r of j.ingredientsOnHand ?? []) push(r?.flavorNote);
  for (const r of j.ingredientsShopping ?? []) push(r?.flavorNote);

  if (notes.length === 0) return undefined;
  const top = notes.slice(0, 3);
  if (top.length === 1) return `Geschmack: ${top[0]}.`;
  if (top.length === 2) return `Geschmack: ${top[0]} und ${top[1]}.`;
  return `Geschmack: ${top[0]}, ${top[1]} und ${top[2]}.`;
}

function buildShoppingAlternativesNote(j: GroqRecipeJson): string | undefined {
  const entries: string[] = [];
  for (const r of j.ingredientsShopping ?? []) {
    const component =
      typeof r?.component === "string" && r.component.trim() ? r.component.trim() : "";
    const alternatives =
      typeof r?.alternatives === "string" && r.alternatives.trim() ? r.alternatives.trim() : "";
    if (!component || !alternatives) continue;
    const cleanedAlternatives = sanitizeAlternativesText(alternatives);
    if (!cleanedAlternatives) continue;
    const value = `${component}: ${cleanedAlternatives}`;
    if (!entries.some((x) => x.toLowerCase() === value.toLowerCase())) entries.push(value);
  }

  if (entries.length === 0) return undefined;
  return entries.slice(0, 6).join("\n");
}

function sanitizeAlternativesText(raw: string): string {
  const parts = raw
    .split(/,|\/|\boder\b/gi)
    .map((x) => x.trim())
    .filter(Boolean);

  const rejectedExact = new Set([
    "getrocknet",
    "trocken",
    "tk",
    "tiefkühl",
    "frisch",
    "gehackt",
    "fein gehackt",
    "grob gehackt",
    "gemahlen",
    "pulver",
    "granulat",
  ]);

  const rejectedContains = [
    /\b(vorgekocht|gekühlt|kalt|warm)\b/i,
    /\b(tl|el|g|kg|ml|l|bund|stück|stk)\b/i,
    /^\d+[.,]?\d*$/,
  ];

  const valid = parts.filter((part) => {
    const p = part.toLowerCase();
    if (p.length < 3) return false;
    if (rejectedExact.has(p)) return false;
    if (rejectedContains.some((rx) => rx.test(p))) return false;
    // Require at least one letter and avoid plain preparation/style descriptors.
    if (!/[a-zäöü]/i.test(p)) return false;
    return true;
  });

  const deduped: string[] = [];
  for (const v of valid) {
    if (!deduped.some((x) => x.toLowerCase() === v.toLowerCase())) deduped.push(v);
  }
  return deduped.slice(0, 3).join(", ");
}

function mapSteps(rows: GroqRecipeJson["steps"]): RecipeMethodStep[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [
      {
        order: 1,
        title: "Schritte fehlen",
        body: "Die Antwort enthielt keine gültigen Kochschritte. Bitte erneut generieren.",
        accent: false,
      },
    ];
  }
  return rows.map((r) => {
    return {
      order: r.order,
      title: r.title.trim(),
      body: r.body.trim(),
      accent: false,
    };
  });
}

/**
 * Maps Groq JSON to persisted `RecipeDetail`. Applies Swiss-German orthography via
 * `normalizeGroqRecipeDetail` so localStorage stores model text already normalized.
 */
export function groqJsonToRecipeDetail(recipeId: string, j: GroqRecipeJson): RecipeDetail {
  const { prep, cook } = resolveRecipeTimes(j);

  const steps = mapSteps(j.steps);
  const cleanupNoteRaw = cleanupNoteFromGroq(j.dishwasherTip);
  const cleanupNote = cleanupNoteRaw;

  const shoppingHints =
    typeof j.shoppingHints === "string" && j.shoppingHints.trim()
      ? j.shoppingHints.trim()
      : undefined;
  const equipmentNote =
    typeof j.equipmentNote === "string" && j.equipmentNote.trim()
      ? j.equipmentNote.trim()
      : undefined;
  const optionalUpgradeNote =
    typeof j.optionalUpgradeNote === "string" && j.optionalUpgradeNote.trim()
      ? j.optionalUpgradeNote.trim()
      : undefined;
  const nutritionFromModel =
    typeof j.nutritionNote === "string" && j.nutritionNote.trim()
      ? j.nutritionNote.trim()
      : undefined;
  const flavorSummaryNote = buildFlavorSummaryNote(j);
  const shoppingAlternativesNote = buildShoppingAlternativesNote(j);

  const basePortions =
    typeof j.servings === "number" && !Number.isNaN(j.servings) && j.servings > 0
      ? Math.min(99, Math.max(1, Math.round(j.servings)))
      : 4;

  const ingredients = mapIngredientsFromGroq(j);

  const title = sanitizeRecipeTitle(j.title);

  return normalizeGroqRecipeDetail({
    id: recipeId,
    title,
    prepMinutes: prep,
    cookMinutes: cook,
    basePortions,
    scalingModes: [
      { id: "portions", label: "Portionen" },
      { id: "percent", label: "Prozent" },
    ],
    defaultScalingId: "portions",
    ingredients,
    steps,
    ...(cleanupNote ? { cleanupNote } : {}),
    ...(shoppingHints ? { shoppingHints } : {}),
    ...(equipmentNote ? { equipmentNote } : {}),
    ...(optionalUpgradeNote ? { optionalUpgradeNote } : {}),
    ...(nutritionFromModel ? { nutritionNote: nutritionFromModel } : {}),
    ...(flavorSummaryNote ? { flavorSummaryNote } : {}),
    ...(shoppingAlternativesNote ? { shoppingAlternativesNote } : {}),
    lastUpdatedLabel: "KI",
  });
}

/** List row for storage; title is Swiss-normalized before persist. */
export function groqJsonToListRow(recipeId: string, j: GroqRecipeJson): RecipeListRow {
  const { total } = resolveRecipeTimes(j);
  const title = sanitizeRecipeTitle(j.title);

  const hasShopping =
    Array.isArray(j.ingredientsShopping) &&
    j.ingredientsShopping.some(
      (x) => typeof x?.component === "string" && x.component.trim().length > 0,
    );

  return normalizeGroqListRow({
    id: recipeId,
    title,
    status: hasShopping ? "shopping" : "pantry",
    minutes: total,
  });
}

function sanitizeRecipeTitle(rawTitle: unknown): string {
  const base = typeof rawTitle === "string" ? rawTitle.trim() : "";
  if (!base) return "Rezept";
  // Remove ingredient-style tails like " ... mit Brokkoli".
  const withoutMitTail = base.replace(/\s+mit\s+.+$/i, "");
  const cleaned = withoutMitTail.replace(/\s{2,}/g, " ").trim().replace(/[-,:;]+$/g, "");
  return cleaned || "Rezept";
}

function isGenericCookingTag(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  if (!t) return false;
  return /^(pfanne|ofen|topf|grill|wok|blech|dampf|steamer)$/.test(t);
}

function summarizeFlavorTagFromIngredients(j: GroqRecipeJson): string {
  const notes: string[] = [];
  const pushNote = (n: unknown) => {
    if (typeof n !== "string") return;
    const trimmed = n.trim();
    if (!trimmed) return;
    const short = trimmed.split(/[.;,]/)[0]?.trim() ?? "";
    if (!short || short.length > 24) return;
    if (!notes.some((x) => x.toLowerCase() === short.toLowerCase())) notes.push(short);
  };
  for (const r of j.ingredientsOnHand ?? []) {
    pushNote(r?.flavorNote);
  }
  for (const r of j.ingredientsShopping ?? []) {
    pushNote(r?.flavorNote);
  }

  if (notes.length >= 2) return `${notes[0]} & ${notes[1]}`;
  if (notes.length === 1) return notes[0];
  return "";
}

export function groqJsonToTag(j: GroqRecipeJson): string {
  const t = typeof j.tag === "string" ? j.tag.trim() : "";
  let out: string;
  if (t.length > 0) {
    if (isGenericCookingTag(t)) {
      const flavorTag = summarizeFlavorTagFromIngredients(j);
      out = flavorTag || t;
    } else {
      out = t;
    }
    if (out.length > 48) out = `${out.slice(0, 45)}…`;
  } else {
    const title = typeof j.title === "string" ? j.title.trim() : "";
    if (title) {
      const short = title.split(/\s+/).slice(0, 4).join(" ");
      out = short.length > 40 ? `${short.slice(0, 37)}…` : short;
    } else {
      out = "—";
    }
  }
  return normalizeSwissGroqText(out);
}
