import type { PantryIngredient, RecipeDetail, RecipeListRow } from "../types";

/** Extra fields for recipe cards on the ingredients screen (e.g. tag). */
export type RecipeCardExtras = { tag: string };

export interface AppState {
  pantry: PantryIngredient[];
  recipeRows: RecipeListRow[];
  recipeDetails: Record<string, RecipeDetail>;
  /** Display order for “Passende Rezepte” on Zutaten (recency / tie-break); not “all matching” ids. */
  zutatenScreenRecipeOrder: string[];
  recipeCardExtras: Record<string, RecipeCardExtras>;
  /** Pantry item IDs selected on Zutaten (multi-select); persisted. */
  selectedPantryIds: string[];
  /**
   * Per recipe: pantry item IDs that must all be selected for a full match.
   * Only recipes with every required id present in the pantry and selected appear under Passende Rezepte.
   */
  recipeRequiredPantryIds: Record<string, string[]>;
  /**
   * Labels (`chipLabel ?? name`) at generation time, same order as `recipeRequiredPantryIds`.
   * Used to match again after pantry rows were recreated (new UUIDs, same ingredients).
   */
  recipeRequiredPantryNames: Record<string, string[]>;
  /** User Groq API key for recipe generation; stored plain in localStorage. */
  groqApiKey: string;
  /** Region / town for shopping hints when generating with “Auch einkaufen” (sent as `AKTUELLER_STANDORT` to Groq). */
  shoppingLocationLabel: string;
  /** Recipe IDs shown on the Rezepte tab (order = display order). */
  bookmarkedRecipeIds: string[];
}
