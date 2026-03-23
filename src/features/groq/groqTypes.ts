/** One line per selected pantry chip (matches `PantryIngredient` fields we send to Groq). */
export type RecipeGenerationPantryLine = {
  name: string;
  category: string;
  status: "precooked" | "raw";
};

export type RecipeGenerationInput = {
  pantryLines: RecipeGenerationPantryLine[];
  /** Draft: EINKAUFSBEREITSCHAFT Ja/Nein */
  willingToShop: boolean;
  /** Region / Ort für Einkaufszutaten und Verfügbarkeit (`AKTUELLER_STANDORT` in der Nutzer-JSON). */
  regionLabel: string;
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
  minutes?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  /** Intended servings / portions the listed quantities refer to (default 4 in mapper). */
  servings?: number;
  tag?: string;
  /** Draft format: getrennt vorhanden / Einkauf */
  ingredientsOnHand?: GroqIngredientLine[];
  ingredientsShopping?: GroqIngredientLine[];
  /** Legacy flat list */
  ingredients?: GroqIngredientLine[];
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

/** One cooking step; model may use alternate keys for the main text. */
export type GroqStepLine = {
  order?: number;
  title?: string;
  body?: string;
  instruction?: string;
  description?: string;
  text?: string;
  content?: string;
};
