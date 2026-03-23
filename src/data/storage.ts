import { APP_STATE_KEY } from "../config/storageKeys";
import { normalizeSwissGroqText } from "../features/groq/swissDisplayText";
import {
  ICON_CATEGORIES,
  type IconCategory,
  type PantryIngredient,
  type RecipeDetail,
} from "../types";
import { categoryFromLegacyMaterialIcon } from "./iconFromCategory";
import { cloneDefaultState, defaultAppState } from "./seed/defaultState";
import type { AppState } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizePantryRow(p: unknown, index: number): PantryIngredient {
  if (!isRecord(p)) {
    return {
      id: "",
      name: "",
      category: "Sonstiges",
      status: "raw",
      addedAt: index,
    };
  }
  const id = typeof p.id === "string" ? p.id : "";
  const name = typeof p.name === "string" ? p.name : "";
  const status =
    p.status === "precooked" || p.status === "raw" ? p.status : "raw";
  const addedAt =
    typeof p.addedAt === "number" && !Number.isNaN(p.addedAt) ? p.addedAt : index;
  const chipLabel = typeof p.chipLabel === "string" ? p.chipLabel : undefined;

  let category: IconCategory;
  if (typeof p.category === "string") {
    const raw = p.category;
    const migrated =
      raw === "Süßmittel & Backen" || raw === "Suessmittel & Backen"
        ? "Süssmittel & Backen"
        : raw;
    if ((ICON_CATEGORIES as readonly string[]).includes(migrated)) {
      category = migrated as IconCategory;
    } else if (typeof p.icon === "string") {
      category = categoryFromLegacyMaterialIcon(p.icon);
    } else {
      category = "Sonstiges";
    }
  } else if (typeof p.icon === "string") {
    category = categoryFromLegacyMaterialIcon(p.icon);
  } else {
    category = "Sonstiges";
  }

  return { id, name, category, status, addedAt, chipLabel };
}

/** Ensure scaling fields exist for older persisted states. */
function patchRecipeDetailEntry(raw: unknown): RecipeDetail {
  const d = (isRecord(raw) ? raw : {}) as Partial<RecipeDetail>;
  const basePortions =
    typeof d.basePortions === "number" &&
    d.basePortions > 0 &&
    !Number.isNaN(d.basePortions)
      ? Math.min(99, Math.max(1, Math.round(d.basePortions)))
      : 4;
  const sm = Array.isArray(d.scalingModes) ? d.scalingModes : [];
  const hasPortionsMode = sm.some((m) => m.id === "portions");
  const hasPercentMode = sm.some((m) => m.id === "percent");
  const scalingModes =
    hasPortionsMode && hasPercentMode
      ? sm
      : [
          { id: "portions", label: "Portionen" },
          { id: "percent", label: "Prozent" },
        ];
  const defaultScalingId = d.defaultScalingId === "percent" ? "percent" : "portions";
  return { ...d, basePortions, scalingModes, defaultScalingId } as RecipeDetail;
}

/** Overlay persisted fields onto defaults; invalid or partial data falls back per-field. */
function normalizeState(raw: unknown): { state: AppState; backfilledRecipeNames: boolean } {
  if (!isRecord(raw)) {
    return { state: cloneDefaultState(), backfilledRecipeNames: false };
  }

  const base = cloneDefaultState();
  let backfilledRecipeNames = false;

  if (Array.isArray(raw.pantry)) {
    base.pantry = (raw.pantry as unknown[]).map((row, i) =>
      normalizePantryRow(row, i),
    );
  }
  if (Array.isArray(raw.recipeRows)) {
    base.recipeRows = raw.recipeRows as AppState["recipeRows"];
  }
  if (isRecord(raw.recipeDetails)) {
    const patched: AppState["recipeDetails"] = {};
    for (const [id, detail] of Object.entries(raw.recipeDetails)) {
      patched[id] = patchRecipeDetailEntry(detail);
    }
    base.recipeDetails = patched;
  }
  if (Array.isArray(raw.zutatenScreenRecipeOrder)) {
    base.zutatenScreenRecipeOrder = raw.zutatenScreenRecipeOrder as string[];
  }
  if (isRecord(raw.recipeCardExtras)) {
    base.recipeCardExtras = raw.recipeCardExtras as AppState["recipeCardExtras"];
  }
  if (Array.isArray(raw.selectedPantryIds)) {
    base.selectedPantryIds = raw.selectedPantryIds.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (isRecord(raw.recipeRequiredPantryIds)) {
    base.recipeRequiredPantryIds = {
      ...base.recipeRequiredPantryIds,
      ...(raw.recipeRequiredPantryIds as AppState["recipeRequiredPantryIds"]),
    };
  }
  if (isRecord(raw.recipeRequiredPantryNames)) {
    base.recipeRequiredPantryNames = {
      ...base.recipeRequiredPantryNames,
      ...(raw.recipeRequiredPantryNames as AppState["recipeRequiredPantryNames"]),
    };
  }

  /** Legacy: derive stored names from current pantry when IDs still exist (enables label matching after UUID churn). */
  for (const [recipeId, ids] of Object.entries(base.recipeRequiredPantryIds)) {
    if (!Array.isArray(ids) || ids.length === 0) continue;
    const existing = base.recipeRequiredPantryNames[recipeId];
    if (Array.isArray(existing) && existing.length === ids.length) continue;
    const names = ids.map((pid) => {
      const p = base.pantry.find((x) => x.id === pid);
      return p ? (p.chipLabel ?? p.name).trim() : "";
    });
    if (names.every((n) => n.length > 0)) {
      base.recipeRequiredPantryNames = {
        ...base.recipeRequiredPantryNames,
        [recipeId]: names,
      };
      backfilledRecipeNames = true;
    }
  }
  if (typeof raw.groqApiKey === "string") {
    base.groqApiKey = raw.groqApiKey;
  }
  if (typeof raw.shoppingLocationLabel === "string") {
    base.shoppingLocationLabel = raw.shoppingLocationLabel;
  }
  if (Array.isArray(raw.bookmarkedRecipeIds)) {
    base.bookmarkedRecipeIds = raw.bookmarkedRecipeIds.filter(
      (x): x is string => typeof x === "string",
    );
  }

  const pantryIds = new Set(base.pantry.map((p) => p.id));
  base.selectedPantryIds = base.selectedPantryIds.filter((id) => pantryIds.has(id));

  base.pantry = base.pantry.map((p, i) => {
    const a = p.addedAt;
    const addedAt =
      typeof a === "number" && !Number.isNaN(a) ? a : i;
    return { ...p, addedAt };
  });

  const recipeIds = new Set(base.recipeRows.map((r) => r.id));
  base.bookmarkedRecipeIds = base.bookmarkedRecipeIds.filter((id) =>
    recipeIds.has(id),
  );

  return { state: base, backfilledRecipeNames };
}

export function loadPersistedState(): AppState {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }
    const { state, backfilledRecipeNames } = normalizeState(JSON.parse(raw));
    if (backfilledRecipeNames) {
      savePersistedState(state);
    }
    return state;
  } catch {
    return cloneDefaultState();
  }
}

export function savePersistedState(state: AppState): void {
  try {
    const normalized = normalizeStringsDeep(state);
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore quota / private mode
  }
}

export function resetPersistedState(): AppState {
  const fresh = cloneDefaultState();
  savePersistedState(fresh);
  return fresh;
}

/** Same `localStorage` entry as usual; everything reset except `groqApiKey`. */
export function resetPersistedStatePreservingGroqKey(groqApiKey: string): AppState {
  const fresh = cloneDefaultState();
  const next: AppState = { ...fresh, groqApiKey };
  savePersistedState(next);
  return next;
}

/** Dev / tests: restore factory defaults without touching localStorage. */
export function getDefaultStateSnapshot(): AppState {
  return cloneDefaultState();
}

export { defaultAppState };

function normalizeStringsDeep<T>(value: T): T {
  if (typeof value === "string") {
    return normalizeSwissGroqText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeStringsDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = normalizeStringsDeep(v);
    }
    return out as T;
  }
  return value;
}
