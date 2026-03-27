import type { AppState } from "../schema";
import { mergedPantrySeed } from "./pantrySeed";

/**
 * Factory defaults: only pantry is seeded. Recipes must come from generation (or future
 * imports)—do not add bundled recipe rows/details here.
 */
export const defaultAppState: AppState = {
  pantry: mergedPantrySeed,
  recipeRows: [],
  recipeDetails: {},
  zutatenScreenRecipeOrder: [],
  recipeCardExtras: {},
  selectedPantryIds: [],
  recipeRequiredPantryIds: {},
  recipeRequiredPantryNames: {},
  groqApiKey: "",
  shoppingLocationLabel: "Hedingen (CH)",
  bookmarkedRecipeIds: [],
  bookmarkAddedAtByRecipeId: {},
};

export function cloneDefaultState(): AppState {
  return JSON.parse(JSON.stringify(defaultAppState)) as AppState;
}
