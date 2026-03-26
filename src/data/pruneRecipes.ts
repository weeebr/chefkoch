import type { AppState } from "./schema";

/**
 * Drop every recipe not in `bookmarkedRecipeIds` so localStorage does not accumulate
 * generated-but-never-saved recipes. Used before appending a new Groq batch.
 */
export function pruneNonBookmarkedRecipes(state: AppState): AppState {
  const keep = new Set(state.bookmarkedRecipeIds);

  const recipeRows = state.recipeRows.filter((r) => keep.has(r.id));

  const recipeDetails: AppState["recipeDetails"] = {};
  for (const [id, detail] of Object.entries(state.recipeDetails)) {
    if (keep.has(id)) recipeDetails[id] = detail;
  }

  const recipeCardExtras: AppState["recipeCardExtras"] = {};
  for (const [id, extras] of Object.entries(state.recipeCardExtras)) {
    if (keep.has(id)) recipeCardExtras[id] = extras;
  }

  const recipeRequiredPantryIds: AppState["recipeRequiredPantryIds"] = {};
  for (const [id, ids] of Object.entries(state.recipeRequiredPantryIds)) {
    if (keep.has(id)) recipeRequiredPantryIds[id] = ids;
  }

  const recipeRequiredPantryNames: AppState["recipeRequiredPantryNames"] = {};
  for (const [id, names] of Object.entries(state.recipeRequiredPantryNames)) {
    if (keep.has(id)) recipeRequiredPantryNames[id] = names;
  }

  const zutatenScreenRecipeOrder = state.zutatenScreenRecipeOrder.filter((id) =>
    keep.has(id),
  );

  return {
    ...state,
    recipeRows,
    recipeDetails,
    recipeCardExtras,
    recipeRequiredPantryIds,
    recipeRequiredPantryNames,
    zutatenScreenRecipeOrder,
  };
}
