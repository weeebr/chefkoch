import type { IconCategory, PantryIngredient } from "../../types";

const c = (x: IconCategory) => x;

/**
 * Starter-Vorrat für Demo/Onboarding (echte Zutatenbeispiele).
 * Rezepte kommen nur aus KI-Generierung.
 *
 * Vorgekocht / Vorrat: Hülsenfrüchte, Trockenware, Sossen, Käse gerieben, TK-Gemüse.
 */
const preCookedSeed: PantryIngredient[] = [
  {
    id: "pc_kidney",
    name: "Rote Kidneybohnen",
    category: c("Vorratsschrank"),
    status: "precooked",
    addedAt: 0,
  },
  {
    id: "pc_peas",
    name: "Grüne Erbsen",
    category: c("Vorratsschrank"),
    status: "precooked",
    addedAt: 1,
  },
  {
    id: "pc_rice",
    name: "Reis",
    category: c("Vorratsschrank"),
    status: "raw",
    addedAt: 2,
  },
  {
    id: "pc_pasta",
    name: "Pasta",
    category: c("Vorratsschrank"),
    status: "raw",
    addedAt: 3,
  },
  {
    id: "pc_vegmix",
    name:
      "Romanesco-Mix (Romanesco, Karottenscheiben, Pelzerkarotten, Brokkoli, Zwiebeln)",
    chipLabel: "Romanesco-Mix",
    category: c("Tiefkühl"),
    status: "precooked",
    addedAt: 4,
  },
  {
    id: "pc_chickpeas",
    name: "Kichererbsen",
    category: c("Tiefkühl"),
    status: "precooked",
    addedAt: 20,
  },
  {
    id: "pc_quinoa",
    name: "Quinoa",
    category: c("Tiefkühl"),
    status: "precooked",
    addedAt: 21,
  },
  {
    id: "pc_white_beans",
    name: "Weisse Bohnen",
    category: c("Vorratsschrank"),
    status: "precooked",
    addedAt: 22,
  },
  {
    id: "pc_pesto",
    name: "Pestosauce",
    category: c("Vorratsschrank"),
    status: "precooked",
    addedAt: 5,
  },
  {
    id: "pc_sweetsour",
    name: "Süsssauer-Sauce",
    category: c("Kühlschrank"),
    status: "precooked",
    addedAt: 6,
  },
  {
    id: "pc_curry",
    name: "Rote Currypaste",
    category: c("Kühlschrank"),
    status: "precooked",
    addedAt: 7,
  },
  {
    id: "pc_cheese_grated",
    name: "Reibkäse",
    category: c("Kühlschrank"),
    status: "precooked",
    addedAt: 8,
  },
  {
    id: "pc_yogurt_nature",
    name: "Joghurt nature",
    category: c("Kühlschrank"),
    status: "precooked",
    addedAt: 23,
  },
];

/** Frisch / Roh: Gemüse, Kräuter, Gewürze, Milchprodukte, Eier. */
const freshSeed: PantryIngredient[] = [
  {
    id: "fr_broccoli",
    name: "Brokkoli",
    category: c("Tiefkühl"),
    status: "precooked",
    addedAt: 9,
  },
  {
    id: "fr_whitekale",
    name: "Weisskohl",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 10,
  },
  {
    id: "fr_pepper",
    name: "Peperoni",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 11,
  },
  {
    id: "fr_garlic",
    name: "Knoblauch",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 12,
  },
  {
    id: "fr_onion",
    name: "Zwiebeln",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 13,
  },
  {
    id: "fr_creamcheese",
    name: "Frischkäse",
    category: c("Kühlschrank"),
    status: "precooked",
    addedAt: 14,
  },
  {
    id: "fr_carrots",
    name: "Karotten",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 15,
  },
  {
    id: "fr_ginger",
    name: "Ingwer",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 16,
  },
  {
    id: "fr_turmeric",
    name: "Kurkuma",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 17,
  },
  {
    id: "fr_eggs",
    name: "Eier",
    category: c("Kühlschrank"),
    status: "precooked",
    addedAt: 18,
  },
  {
    id: "fr_kohlrabi",
    name: "Kohlrabi",
    category: c("Kühlschrank"),
    status: "raw",
    addedAt: 19,
  },
];

function mergePantryByName(items: PantryIngredient[]): PantryIngredient[] {
  const seen = new Set<string>();
  const out: PantryIngredient[] = [];
  for (const item of items) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    out.push(item);
  }
  return out;
}

const mergedPantrySeed = mergePantryByName([
  ...preCookedSeed,
  ...freshSeed,
]);

export const pantryIdSet = new Set(mergedPantrySeed.map((p) => p.id));
export { mergedPantrySeed };
