import type { IconCategory } from "../types";

/** Material Symbols name for a pantry category (single source of truth). */
export function materialIconForCategory(category: IconCategory): string {
  return ICON_FOR_CATEGORY[category];
}

/** Default Material icon name for each pantry category (new ingredient form). */
export const ICON_FOR_CATEGORY: Record<IconCategory, string> = {
  Kühlschrank: "device_thermostat",
  Vorratsschrank: "kitchen",
  Tiefkühl: "ac_unit",
};
