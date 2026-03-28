import type { PantryIngredient, RecipeIngredientRow } from "../types";
import { normalizeIngredientLabel } from "./ingredientLabel";

/**
 * Classifies scaled display rows into shopping vs selected using the same rules as
 * `matchRecipes.missingIngredientsForCurrentSelection`.
 */
export function splitShoppingAndSelectedDisplayRows(
  rows: RecipeIngredientRow[],
  displayRows: RecipeIngredientRow[],
  pantryById: Map<string, PantryIngredient>,
  selectedIds: Set<string>,
): [RecipeIngredientRow[], RecipeIngredientRow[]] {
  if (rows.length !== displayRows.length) {
    throw new Error("splitShoppingAndSelectedDisplayRows: length mismatch");
  }
  const selectedCounts = new Map<string, number>();
  for (const pid of selectedIds) {
    const p = pantryById.get(pid);
    if (!p) continue;
    const key = normalizeIngredientLabel(p.chipLabel ?? p.name);
    if (!key) continue;
    selectedCounts.set(key, (selectedCounts.get(key) ?? 0) + 1);
  }
  const shopping: RecipeIngredientRow[] = [];
  const selected: RecipeIngredientRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const ingredient = rows[i]!;
    const disp = displayRows[i]!;
    const base = ingredient.component.split(/[,(]/)[0]?.trim() ?? "";
    const key = normalizeIngredientLabel(base);
    if ((selectedCounts.get(key) ?? 0) > 0) {
      selectedCounts.set(key, (selectedCounts.get(key) ?? 0) - 1);
      selected.push(disp);
    } else {
      shopping.push(disp);
    }
  }
  return [shopping, selected];
}
