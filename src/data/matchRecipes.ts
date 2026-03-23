import { normalizeIngredientLabel } from "./ingredientLabel";
import type { AppState } from "./schema";

/**
 * Every required label (with multiplicity) must appear among selected pantry rows
 * (same label source as at generation: chipLabel ?? name).
 * Extra selected ingredients are allowed — same as ID subset semantics.
 */
function matchesByRequiredNames(
  requiredNames: string[],
  state: AppState,
  selected: Set<string>,
): boolean {
  if (requiredNames.length === 0) return false;

  const selectedItems = state.pantry.filter((p) => selected.has(p.id));
  const available = selectedItems.map((p) =>
    normalizeIngredientLabel(p.chipLabel ?? p.name),
  );
  const requiredNorm = requiredNames.map((n) => normalizeIngredientLabel(n));

  const used = new Set<number>();
  for (const req of requiredNorm) {
    const idx = available.findIndex((lbl, i) => !used.has(i) && lbl === req);
    if (idx === -1) return false;
    used.add(idx);
  }
  return true;
}

function missingCountByRequiredNames(
  requiredNames: string[],
  state: AppState,
  selected: Set<string>,
): number {
  if (requiredNames.length === 0) return Infinity;

  const selectedItems = state.pantry.filter((p) => selected.has(p.id));
  const available = selectedItems.map((p) =>
    normalizeIngredientLabel(p.chipLabel ?? p.name),
  );
  const requiredNorm = requiredNames.map((n) => normalizeIngredientLabel(n));

  const used = new Set<number>();
  let matched = 0;
  for (const req of requiredNorm) {
    const idx = available.findIndex((lbl, i) => !used.has(i) && lbl === req);
    if (idx === -1) continue;
    used.add(idx);
    matched++;
  }
  return requiredNorm.length - matched;
}

function missingCountByRequiredIds(recipeId: string, state: AppState): number {
  const requiredIds = state.recipeRequiredPantryIds[recipeId];
  if (!requiredIds?.length) return Infinity;

  const pantryIds = new Set(state.pantry.map((p) => p.id));
  const selected = new Set(state.selectedPantryIds);
  let missing = 0;
  for (const pid of requiredIds) {
    if (pantryIds.has(pid) && selected.has(pid)) continue;
    missing++;
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
 *
 * Note: missingCount is based on required labels (preferred) and uses IDs only
 * as a fallback when label info is missing.
 */
export function recipeMissingCount(recipeId: string, state: AppState): number {
  const names = state.recipeRequiredPantryNames[recipeId];
  const selected = new Set(state.selectedPantryIds);

  if (Array.isArray(names) && names.length > 0) {
    return missingCountByRequiredNames(names, state, selected);
  }
  return missingCountByRequiredIds(recipeId, state);
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
  const names = state.recipeRequiredPantryNames[recipeId];
  const selectedIds = new Set(state.selectedPantryIds);

  if (Array.isArray(names) && names.length > 0) {
    const selectedItems = state.pantry.filter((p) => selectedIds.has(p.id));
    const availableNorm = selectedItems.map((p) =>
      normalizeIngredientLabel(p.chipLabel ?? p.name),
    );
    const used = new Set<number>();
    const out: string[] = [];

    for (const reqName of names) {
      const reqNorm = normalizeIngredientLabel(reqName);
      if (!reqNorm) continue;
      const idx = availableNorm.findIndex((lbl, i) => !used.has(i) && lbl === reqNorm);
      if (idx === -1) {
        out.push(reqName);
        if (out.length >= maxMissing) break;
      } else {
        used.add(idx);
      }
    }
    return out;
  }

  // Fallback: use required IDs and map to pantry labels.
  const requiredIds = state.recipeRequiredPantryIds[recipeId];
  if (!Array.isArray(requiredIds) || requiredIds.length === 0) return [];
  const pantryById = new Map(state.pantry.map((p) => [p.id, p]));
  const out: string[] = [];
  for (const pid of requiredIds) {
    if (!selectedIds.has(pid)) {
      const p = pantryById.get(pid);
      if (p) out.push(p.chipLabel ?? p.name);
      if (out.length >= maxMissing) break;
    }
  }
  return out;
}
