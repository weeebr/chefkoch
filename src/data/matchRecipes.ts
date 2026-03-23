import { normalizeIngredientLabel } from "./ingredientLabel";
import type { AppState } from "./schema";

function selectedIngredientCounts(state: AppState): Map<string, number> {
  const pantryById = new Map(state.pantry.map((p) => [p.id, p]));
  const selectedIds = new Set(state.selectedPantryIds);
  const counts = new Map<string, number>();
  for (const pid of selectedIds) {
    const p = pantryById.get(pid);
    if (!p) continue;
    const key = normalizeIngredientLabel(p.chipLabel ?? p.name);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function ingredientBaseLabel(component: string): string {
  return component.split(/[,(]/)[0]?.trim() ?? component.trim();
}

/**
 * Source of truth for matching:
 * compare recipe ingredient rows against current selected pantry chips
 * with the same multiplicity behavior as detail-screen shopping split.
 */
function missingIngredientsForCurrentSelection(
  recipeId: string,
  state: AppState,
): string[] {
  const detail = state.recipeDetails[recipeId];
  if (!detail) return [];
  const requiredNames = state.recipeRequiredPantryNames[recipeId] ?? [];
  const requiredSet = new Set(
    requiredNames.map((x) => normalizeIngredientLabel(x)).filter(Boolean),
  );

  const selectedCounts = selectedIngredientCounts(state);
  const missing: string[] = [];

  for (const row of detail.ingredients) {
    const display = ingredientBaseLabel(row.component);
    const key = normalizeIngredientLabel(display);
    if (!key) continue;
    // In shopping mode, detail ingredients can include add-ons not present as chips.
    // Match status should only be based on the pantry-required ingredient universe.
    if (requiredSet.size > 0 && !requiredSet.has(key)) continue;

    const left = selectedCounts.get(key) ?? 0;
    if (left > 0) {
      selectedCounts.set(key, left - 1);
      continue;
    }
    missing.push(display);
  }
  return missing;
}

/**
 * True when the current Zutaten selection matches the recipe’s required pantry:
 * either every stored pantry id is still present and selected, or (after pantry UUID
 * churn) the same ingredient labels appear among selected rows.
 */
export function recipeFullyMatches(recipeId: string, state: AppState): boolean {
  const missing = recipeMissingCount(recipeId, state);
  return missing === 0;
}

/**
 * Missing ingredient count w.r.t the user's current chip selection.
 * Used for:
 * - full matches (missing=0)
 * - partial matches (missing<=allowance)
 */
export function recipeMissingCount(recipeId: string, state: AppState): number {
  const missing = missingIngredientsForCurrentSelection(recipeId, state);
  return missing.length;
}

export function recipeMatchKind(
  recipeId: string,
  state: AppState,
  maxMissing: number,
): { matchMissingCount: number; matchKind: "full" | "partial" } | null {
  const missing = recipeMissingCount(recipeId, state);
  if (!Number.isFinite(missing)) return null;
  if (missing === 0) return { matchMissingCount: 0, matchKind: "full" };
  if (missing > 0 && missing <= maxMissing)
    return { matchMissingCount: missing, matchKind: "partial" };
  return null;
}

export function recipeMissingIngredients(
  recipeId: string,
  state: AppState,
  maxMissing: number,
): string[] {
  return missingIngredientsForCurrentSelection(recipeId, state).slice(0, maxMissing);
}
