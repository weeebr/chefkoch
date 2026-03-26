import type { AppState } from "../../data/schema";
import { pruneNonBookmarkedRecipes } from "../../data/pruneRecipes";
import {
  groqJsonToListRow,
  groqJsonToRecipeDetail,
  groqJsonToTag,
} from "./groqMap";
import { normalizeGroqRecipeForPolicy } from "./groqPolicy";
import type { GroqRecipeJson } from "./groqTypes";

export type GeneratedRecipesPayload = {
  recipes: GroqRecipeJson[];
  /** Snapshot of selected chips at generation start; used as source of truth for persisted matching metadata. */
  selectedPantry: Array<{ id: string; name: string }>;
  /** When false, shopping lists and purchase hints are stripped before mapping. */
  willingToShop: boolean;
};

function appendGeneratedRecipes(
  prev: AppState,
  payload: GeneratedRecipesPayload,
): AppState {
  const { recipes, selectedPantry, willingToShop } = payload;
  let next: AppState = prev;
  const selectedPantryIds = selectedPantry.map((x) => x.id);
  const selectedPantryNames = selectedPantry.map((x) => x.name);
  const newIds: string[] = [];

  for (const json of recipes) {
    const normalized = normalizeGroqRecipeForPolicy(
      json,
      willingToShop,
      selectedPantryNames,
    );
    const id = crypto.randomUUID();
    newIds.push(id);
    next = {
      ...next,
      recipeRows: [...next.recipeRows, groqJsonToListRow(id, normalized)],
      recipeDetails: {
        ...next.recipeDetails,
        [id]: groqJsonToRecipeDetail(id, normalized),
      },
      recipeRequiredPantryIds: {
        ...next.recipeRequiredPantryIds,
        [id]: [...selectedPantryIds],
      },
      recipeRequiredPantryNames: {
        ...next.recipeRequiredPantryNames,
        [id]: [...selectedPantryNames],
      },
      recipeCardExtras: {
        ...next.recipeCardExtras,
        [id]: { tag: groqJsonToTag(normalized) },
      },
    };
  }

  next.zutatenScreenRecipeOrder = [...newIds, ...next.zutatenScreenRecipeOrder];
  return next;
}

/** Pure state transition: prune non-bookmarked recipes, then append generated recipes and prepend their ids to `zutatenScreenRecipeOrder`. */
export function applyGeneratedRecipesBatch(
  prev: AppState,
  payload: GeneratedRecipesPayload,
): AppState {
  return appendGeneratedRecipes(pruneNonBookmarkedRecipes(prev), payload);
}

/** Append generated recipes without pruning; used for progressive in-flight insertion. */
export function appendGeneratedRecipesBatch(
  prev: AppState,
  payload: GeneratedRecipesPayload,
): AppState {
  return appendGeneratedRecipes(prev, payload);
}
