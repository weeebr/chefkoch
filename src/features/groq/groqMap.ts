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

function formatQuantityWithHintsFlat(r: GroqIngredientLine): string {
  const q =
    typeof r?.quantity === "string" && r.quantity.trim()
      ? r.quantity.trim()
      : "n. B.";
  const bits: string[] = [];
  if (typeof r.purchaseHint === "string" && r.purchaseHint.trim()) {
    bits.push(r.purchaseHint.trim());
  }
  if (typeof r.flavorNote === "string" && r.flavorNote.trim()) {
    bits.push(r.flavorNote.trim());
  }
  if (bits.length === 0) return q;
  return `${q} · ${bits.join(" · ")}`;
}

function mapIngredientsFlat(rows: GroqRecipeJson["ingredients"]): RecipeIngredientRow[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [{ component: "—", quantity: "—" }];
  }
  const mapped = rows
    .map((r, i) => ({
      component:
        typeof r?.component === "string" && r.component.trim()
          ? r.component.trim()
          : `Zutat ${i + 1}`,
      quantity: formatQuantityWithHintsFlat(r),
    }))
    .filter((row) => !isIngredientHeaderRow(row.component));
  return mapped.length > 0 ? mapped : [{ component: "—", quantity: "—" }];
}

function mapIngredientsFromGroq(j: GroqRecipeJson): RecipeIngredientRow[] {
  const onHand = j.ingredientsOnHand;
  const shop = j.ingredientsShopping;

  if (
    (Array.isArray(onHand) && onHand.length > 0) ||
    (Array.isArray(shop) && shop.length > 0)
  ) {
    const rows: RecipeIngredientRow[] = [];
    const formatQuantityWithHints = (r: GroqIngredientLine): string => {
      const q =
        typeof r?.quantity === "string" && r.quantity.trim()
          ? r.quantity.trim()
          : "—";
      const bits: string[] = [];
      if (typeof r.purchaseHint === "string" && r.purchaseHint.trim()) {
        bits.push(r.purchaseHint.trim());
      }
      if (typeof r.flavorNote === "string" && r.flavorNote.trim()) {
        bits.push(r.flavorNote.trim());
      }
      if (bits.length === 0) return q;
      return `${q} · ${bits.join(" · ")}`;
    };

    const pushLine = (r: GroqIngredientLine) => {
      const c =
        typeof r?.component === "string" && r.component.trim()
          ? r.component.trim()
          : "—";
      if (isIngredientHeaderRow(c)) return;
      const alt =
        typeof r?.alternatives === "string" && r.alternatives.trim()
          ? ` (Alternativen: ${r.alternatives.trim()})`
          : "";
      rows.push({
        component: `${c}${alt}`,
        quantity: formatQuantityWithHints(r),
      });
    };

    if (Array.isArray(onHand) && onHand.length > 0) {
      for (const r of onHand) pushLine(r);
    }
    if (Array.isArray(shop) && shop.length > 0) {
      for (const r of shop) pushLine(r);
    }
    if (rows.length > 0) return rows;
  }
  return mapIngredientsFlat(j.ingredients);
}

function stepInstructionText(r: GroqStepLine): string {
  const o = r as Record<string, unknown>;
  const keys: unknown[] = [
    r.body,
    r.instruction,
    r.description,
    r.text,
    r.content,
    o.detail,
    o.details,
    o.beschreibung,
  ];
  for (const p of keys) {
    if (typeof p === "string" && p.trim().length > 0) return p.trim();
  }
  return "";
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
  return rows.map((r, i) => {
    const order =
      typeof r?.order === "number" && !Number.isNaN(r.order) ? r.order : i + 1;
    let title =
      typeof r?.title === "string" && r.title.trim() ? r.title.trim() : `Schritt ${i + 1}`;
    let body = stepInstructionText(r);

    if (!body && title.length > 55) {
      body = title;
      title = `Schritt ${i + 1}`;
    }
    if (!body) body = "—";

    return {
      order,
      title,
      body,
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
  const nutritionNote =
    typeof j.nutritionNote === "string" && j.nutritionNote.trim()
      ? j.nutritionNote.trim()
      : undefined;

  const basePortions =
    typeof j.servings === "number" && !Number.isNaN(j.servings) && j.servings > 0
      ? Math.min(99, Math.max(1, Math.round(j.servings)))
      : 4;

  const ingredients = mapIngredientsFromGroq(j);

  return normalizeGroqRecipeDetail({
    id: recipeId,
    title: j.title.trim(),
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
    ...(nutritionNote ? { nutritionNote } : {}),
    lastUpdatedLabel: "KI",
  });
}

/** List row for storage; title is Swiss-normalized before persist. */
export function groqJsonToListRow(recipeId: string, j: GroqRecipeJson): RecipeListRow {
  const { total } = resolveRecipeTimes(j);

  const hasShopping =
    Array.isArray(j.ingredientsShopping) &&
    j.ingredientsShopping.some(
      (x) => typeof x?.component === "string" && x.component.trim().length > 0,
    );

  return normalizeGroqListRow({
    id: recipeId,
    title: j.title.trim(),
    status: hasShopping ? "shopping" : "pantry",
    minutes: total,
  });
}

export function groqJsonToTag(j: GroqRecipeJson): string {
  const t = typeof j.tag === "string" ? j.tag.trim() : "";
  let out: string;
  if (t.length > 0) {
    out = t.length > 48 ? `${t.slice(0, 45)}…` : t;
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
