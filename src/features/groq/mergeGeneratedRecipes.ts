/**
 * Merges backend-typed recipe results into AppState.
 * OWNERSHIP: state assembly from typed backend payloads only.
 * FORBIDDEN: accepting GroqRecipeJson, calling groqJsonTo* mappers,
 * or performing any AI output transformation/sanitization.
 */
import type { AppState } from "../../data/schema";
import { pruneNonBookmarkedRecipes } from "../../data/pruneRecipes";
import type { RecipeDetail, RecipeListRow } from "../../types";

export type TypedRecipePayload = {
  id: string;
  detail: RecipeDetail;
  listRow: RecipeListRow;
  tag: string;
};

export type GeneratedRecipesPayload = {
  recipes: TypedRecipePayload[];
  /** Selected non-spice pantry rows only (strict coverage universe). */
  selectedPantry: Array<{ id: string; name: string }>;
};

function appendGeneratedRecipes(
  prev: AppState,
  payload: GeneratedRecipesPayload,
): AppState {
  const { recipes, selectedPantry } = payload;
  let next: AppState = prev;
  const selectedPantryIds = selectedPantry.map((x) => x.id);
  const selectedPantryNames = selectedPantry.map((x) => x.name);
  const newIds: string[] = [];

  for (const recipe of recipes) {
    newIds.push(recipe.id);
    next = {
      ...next,
      recipeRows: [...next.recipeRows, recipe.listRow],
      recipeDetails: {
        ...next.recipeDetails,
        [recipe.id]: recipe.detail,
      },
      recipeRequiredPantryIds: {
        ...next.recipeRequiredPantryIds,
        [recipe.id]: [...selectedPantryIds],
      },
      recipeRequiredPantryNames: {
        ...next.recipeRequiredPantryNames,
        [recipe.id]: [...selectedPantryNames],
      },
      recipeCardExtras: {
        ...next.recipeCardExtras,
        [recipe.id]: { tag: recipe.tag },
      },
    };
  }

  const order = [...next.zutatenScreenRecipeOrder];
  for (const id of newIds) {
    if (!order.includes(id)) order.push(id);
  }
  next.zutatenScreenRecipeOrder = order;
  return next;
}

/** Pure state transition: prune non-bookmarked recipes, then append generated recipes and append their ids to `zutatenScreenRecipeOrder`. */
export function applyGeneratedRecipesBatch(
  prev: AppState,
  payload: GeneratedRecipesPayload,
): AppState {
  return appendGeneratedRecipes(pruneNonBookmarkedRecipes(prev), payload);
}

/** Append generated recipes without pruning; used for progressive in-flight insertion (ids appended in fetch order). */
export function appendGeneratedRecipesBatch(
  prev: AppState,
  payload: GeneratedRecipesPayload,
): AppState {
  return appendGeneratedRecipes(prev, payload);
}
