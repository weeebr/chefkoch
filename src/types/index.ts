export type ActiveScreen = "ingredients" | "recipes" | "settings";

export type IngredientStatus = "precooked" | "raw";

/** Icon / category groups for ingredients (German UI). */
export const ICON_CATEGORIES = [
  "Kühlschrank",
  "Vorratsschrank",
  "Tiefkühl",
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

export interface PantryIngredient {
  id: string;
  name: string;
  /** Pantry category; Material icon is derived via `materialIconForCategory`. */
  category: IconCategory;
  status: IngredientStatus;
  /** Unix ms; higher = added more recently (for ordering). */
  addedAt: number;
  /** Short label for Zutaten chips; defaults to `name` when omitted. */
  chipLabel?: string;
}

export interface IngredientChipItem {
  id: string;
  name: string;
  category: IconCategory;
}

export interface RecipeMatchCard {
  id: string;
  title: string;
  minutes: number;
  tag: string;
  /** How many required ingredients are missing from current selection (0 = full match). */
  matchMissingCount: number;
  /** `full` when missing count is 0, otherwise `partial` (<= configured allowance). */
  matchKind: "full" | "partial";
  /** Missing ingredients (labels), capped to the UI allowance. */
  missingIngredients: string[];
  /** Source recipe classification for styling (Aus Vorrat vs Einkauf nötig). */
  status: RecipeRowStatus;
}

export type RecipeRowStatus = "pantry" | "shopping";

export interface RecipeListRow {
  id: string;
  title: string;
  status: RecipeRowStatus;
  minutes: number;
}

export interface PaginationMeta {
  showing: number;
  total: number;
}

export interface RecipeIngredientRow {
  component: string;
  quantity: string;
}

export interface RecipeMethodStep {
  order: number;
  title: string;
  body: string;
  /** If true, circle + title use primary accent (never applied to the first listed step). */
  accent?: boolean;
}

export interface RecipeDetail {
  id: string;
  title: string;
  /** Total time from start to serve (prep + cooking), whole minutes. */
  minutes: number;
  /**
   * Written recipe quantities refer to this many portions (scaling baseline).
   * UI uses this with Portionen vs. % modes.
   */
  basePortions: number;
  scalingModes: { id: string; label: string }[];
  /** Which tab is selected first: `portions` (custom portion count) or `percent` (%) */
  defaultScalingId: string;
  ingredients: RecipeIngredientRow[];
  /** Subset of implicit base staples this recipe needs (never listed in ingredient tables). */
  requiredBaseStaples: string[];
  /** Explicit spices (not base salt/pepper); same row shape as ingredients. */
  spices: RecipeIngredientRow[];
  steps: RecipeMethodStep[];
  /** Optional tip (e.g. Abwasch); not part of numbered steps. */
  cleanupNote?: string;
  /** Regional / purchase context (from AI); omitted when user disallows shopping. */
  shoppingHints?: string;
  /** Preferred equipment (Pfanne, Ofen, Grill …). */
  equipmentNote?: string;
  /** Logic B: optional-upgrade blurb (works without shopping, better with add-ons). */
  optionalUpgradeNote?: string;
  /** Short balance / lifestyle line. */
  nutritionNote?: string;
  /** Optional concise flavor summary derived from ingredient flavor hints. */
  flavorSummaryNote?: string;
  /** Optional shopping-only summary of useful ingredient substitutions. */
  shoppingAlternativesNote?: string;
  lastUpdatedLabel: string;
}
