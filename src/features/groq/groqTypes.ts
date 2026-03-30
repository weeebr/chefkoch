/** One line per selected pantry chip (matches `PantryIngredient` fields we send to Groq). */
export type RecipeGenerationPantryLine = {
  name: string;
  category: string;
  status: "precooked" | "raw" | "spice";
};

export type RecipeGenerationInput = {
  pantryLines: RecipeGenerationPantryLine[];
  /** Draft: EINKAUFSBEREITSCHAFT Ja/Nein */
  willingToShop: boolean;
  /** When true, all selected pantry ingredients must appear in `ingredientsOnHand`. */
  strictUseAllSelected: boolean;
  /** Region / Ort für Einkaufszutaten und Verfügbarkeit (`AKTUELLER_STANDORT` in der Nutzer-JSON). */
  regionLabel: string;
  /**
   * When generating multiple distinct recipes sequentially, previous recipe titles
   * are passed so the model can avoid similarity.
   */
  previousRecipeTitles?: string[];
  /**
   * Minimal profile context from prior generated recipes to encourage distinctness
   * without passing full prior recipe bodies.
   */
  previousRecipeHints?: Array<{
    title: string;
    tag?: string;
    equipmentNote?: string;
    flavorNote?: string;
  }>;
  /** Slot-level dish mode, independent from creative/common style mode. */
  useSlotModeThisSlot?: "pasta" | "rice" | "else";
  /** Slot-level style mode, independent from pasta/rice/else slot mode. */
  useStyleModeThisSlot?: "common" | "creative";
};

export type GroqIngredientLine = {
  component?: string;
  quantity?: string;
  /** Draft: Alternativen für Einkaufszutaten */
  alternatives?: string;
  /** Draft: z. B. „Kühlregal Coop“, „oft am Kiosk“ */
  purchaseHint?: string;
  /** Draft: Geschmacks-/Ergebnis-Hinweis zur Zutat oder Alternative */
  flavorNote?: string;
};

/** Parsed from model; maps to `RecipeDetail` / `RecipeListRow`. */
export type GroqRecipeJson = {
  title: string;
  /** Total minutes from start to serve (prep, cooking, resting as needed). */
  minutes: number;
  /** Intended servings / portions the listed quantities refer to (default 4 in mapper). */
  servings?: number;
  tag?: string;
  /** Draft format: getrennt vorhanden / Einkauf */
  ingredientsOnHand?: GroqIngredientLine[];
  ingredientsShopping?: GroqIngredientLine[];
  /** Spices actually used; quantities required. Not covered by implicit base pantry. */
  spices: GroqIngredientLine[];
  /** Which implicit base staples (canonical names) this recipe needs; never duplicate in ingredient arrays. */
  requiredBaseStaples: string[];
  steps?: GroqStepLine[];
  /** Draft: Abwasch-Tipp (displayed as optional note, not a step) */
  dishwasherTip?: string;
  /**
   * Draft: praktische Bezugs-/Verfügbarkeitshinweise (Region, Laden, „gibt’s fast überall“).
   * Ignored client-side when user did not allow shopping.
   */
  shoppingHints?: string;
  /** Draft: bevorzugtes Setup — z. B. eine Pfanne, Ofen, Grill, optional Dampf */
  equipmentNote?: string;
  /**
   * Draft: bei Logik B — Kurztext, dass das Gericht ohne Einkauf geht, mit Zusatz aber runder wird.
   */
  optionalUpgradeNote?: string;
  /** Draft: eine Zeile zu ausgewogener Mahlzeit / Lifestyle-Fit */
  nutritionNote?: string;
};

/** One cooking step in schema-validated response format. */
export type GroqStepLine = {
  order: number;
  title: string;
  body: string;
};

/**
 * Typed result returned by the backend after validation, sanitization, and mapping.
 * The client receives this shape — never raw GroqRecipeJson.
 */
export type GeneratedRecipeResult = {
  id: string;
  detail: import("../../types").RecipeDetail;
  listRow: import("../../types").RecipeListRow;
  tag: string;
  totalTokens?: number;
  finishReason?: string;
};
