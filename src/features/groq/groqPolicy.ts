import { baseStapleDisplayNameFromComponent } from "../../data/basePantry";
import { normalizeIngredientLabel } from "../../data/ingredientLabel";
import type { GroqIngredientLine, GroqRecipeJson } from "./groqTypes";

/**
 * True if `component` refers to one of the allowed pantry names (substring match
 * after normalizing the part before comma/paren).
 */
export function ingredientComponentMatchesSelection(
  component: string,
  allowedNames: string[],
): boolean {
  const first = component.split(/[,(]/)[0]?.trim() ?? component;
  const base = normalizeIngredientLabel(first);
  if (base.length < 2) return false;
  for (const raw of allowedNames) {
    const a = normalizeIngredientLabel(raw);
    if (a.length < 2) continue;
    // For predictability in non-shopping mode we only accept exact label matches.
    // Missing entries are handled separately by injecting required chips.
    if (base === a) return true;
  }
  return false;
}

function stripBaseStapleLines(rows: GroqIngredientLine[] | undefined): GroqIngredientLine[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => {
    const c = typeof r.component === "string" ? r.component : "";
    return !baseStapleDisplayNameFromComponent(c);
  });
}

function filterIngredientsBySelection(
  rows: GroqIngredientLine[] | undefined,
  allowedNames: string[],
): GroqIngredientLine[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => {
    const c = typeof r.component === "string" ? r.component : "";
    return ingredientComponentMatchesSelection(c, allowedNames);
  });
}

function coversRequiredByComponent(component: string | undefined, required: string): boolean {
  if (typeof component !== "string" || !component.trim() || !required.trim()) return false;
  return ingredientComponentMatchesSelection(component, [required]);
}

/**
 * Ensure the model used every user-selected ingredient at least once in `ingredientsOnHand`.
 * If the model omits some, we inject deterministic placeholders so the UI/list matches chips.
 */
function ensureAllRequiredInIngredientsOnHand(
  onHand: GroqIngredientLine[],
  requiredNames: string[],
): GroqIngredientLine[] {
  if (!Array.isArray(requiredNames) || requiredNames.length === 0) return onHand;
  const used = new Set<number>();
  const missing: string[] = [];

  for (let i = 0; i < requiredNames.length; i++) {
    const required = requiredNames[i] ?? "";
    const idx = onHand.findIndex(
      (line, j) =>
        !used.has(j) && coversRequiredByComponent(line.component, required),
    );
    if (idx === -1) missing.push(required.trim());
    else used.add(idx);
  }

  if (missing.length === 0) return onHand;

  return [
    ...onHand,
    ...missing.map((name) => ({
      component: name,
      quantity: "—",
    })),
  ];
}

/**
 * When the user did not opt in to shopping: strip shopping-only fields, drop
 * `ingredientsOnHand` lines that do not match selected chips.
 */
export function normalizeGroqRecipeForPolicy(
  j: GroqRecipeJson,
  willingToShop: boolean,
  allowedPantryNames: string[],
): GroqRecipeJson {
  const requiredNames = allowedPantryNames;

  const jStripped: GroqRecipeJson = {
    ...j,
    ingredientsOnHand: stripBaseStapleLines(j.ingredientsOnHand),
    ingredientsShopping: stripBaseStapleLines(j.ingredientsShopping),
    spices: stripBaseStapleLines(j.spices),
  };

  const filteredOnHand = filterIngredientsBySelection(jStripped.ingredientsOnHand, requiredNames);
  const ensuredOnHand = ensureAllRequiredInIngredientsOnHand(filteredOnHand, requiredNames);

  if (willingToShop) {
    return {
      ...jStripped,
      ingredientsOnHand: ensuredOnHand,
    };
  }

  const { shoppingHints: _sh, optionalUpgradeNote: _ou, ...rest } = jStripped;

  return {
    ...rest,
    // Ensure we use all selected chips at least once in the visible ingredient list.
    ingredientsOnHand: ensuredOnHand,
    ingredientsShopping: [],
  };
}
