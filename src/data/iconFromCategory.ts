import type { IconCategory } from "../types";

/** Material Symbols name for a pantry category (single source of truth). */
export function materialIconForCategory(category: IconCategory): string {
  return ICON_FOR_CATEGORY[category];
}

/** Best-effort category when loading legacy data that only stored `icon` (Material name). */
export function categoryFromLegacyMaterialIcon(materialIconName: string): IconCategory {
  const entries = Object.entries(ICON_FOR_CATEGORY) as [IconCategory, string][];
  const found = entries.find(([, icon]) => icon === materialIconName);
  return found ? found[0] : "Sonstiges";
}

/** Default Material icon name for each pantry category (new ingredient form). */
export const ICON_FOR_CATEGORY: Record<IconCategory, string> = {
  "Obst & Gemüse": "nutrition",
  "Kräuter & Blattgemüse": "grass",
  Pilze: "forest",
  "Hülsenfrüchte & Nüsse": "grain",
  "Getreide, Reis & Teigwaren": "bakery_dining",
  "Gewürze & Würzmittel": "soup_kitchen",
  "Milchprodukte & Käse": "icecream",
  Eier: "egg",
  "Fleisch & Wurst": "set_meal",
  Geflügel: "dinner_dining",
  "Fisch & Meeresfrüchte": "set_meal",
  "Öle, Essig & Fette": "water_drop",
  "Süssmittel & Backen": "cake",
  "Konserven & Vorratskammer": "inventory_2",
  Tiefkühl: "ac_unit",
  Getränke: "local_cafe",
  Sonstiges: "shopping_basket",
};
