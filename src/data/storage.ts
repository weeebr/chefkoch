/**
 * Persistence layer: save/load AppState from localStorage.
 * OWNERSHIP: persist data + validate persisted shape only.
 * FORBIDDEN: Swiss normalization, AI text mutation, or any recipe text transformation.
 */
import { APP_STATE_KEY } from "../config/storageKeys";
import { ICON_CATEGORIES } from "../types";
import { cloneDefaultState, defaultAppState } from "./seed/defaultState";
import type { AppState } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isValidRecipeIngredientRow(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return typeof v.component === "string" && typeof v.quantity === "string";
}

function isValidRecipeMethodStep(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return (
    typeof v.order === "number" &&
    typeof v.title === "string" &&
    typeof v.body === "string"
  );
}

function isValidRecipeDetail(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.title !== "string") return false;
  if (typeof v.minutes !== "number" || !Number.isFinite(v.minutes)) return false;
  if (typeof v.basePortions !== "number" || typeof v.defaultScalingId !== "string") return false;
  if (typeof v.lastUpdatedLabel !== "string") return false;
  if (!Array.isArray(v.scalingModes)) return false;
  if (
    !v.scalingModes.every(
      (m) =>
        isRecord(m) &&
        typeof m.id === "string" &&
        typeof (m as { label?: unknown }).label === "string",
    )
  ) {
    return false;
  }
  if (!Array.isArray(v.ingredients) || !v.ingredients.every(isValidRecipeIngredientRow)) return false;
  if (!Array.isArray(v.requiredBaseStaples) || !v.requiredBaseStaples.every((x) => typeof x === "string")) {
    return false;
  }
  if (!Array.isArray(v.spices) || !v.spices.every(isValidRecipeIngredientRow)) return false;
  if (!Array.isArray(v.steps) || !v.steps.every(isValidRecipeMethodStep)) return false;
  const optionalNotes = [
    "cleanupNote",
    "shoppingHints",
    "equipmentNote",
    "optionalUpgradeNote",
    "nutritionNote",
    "flavorSummaryNote",
    "shoppingAlternativesNote",
  ] as const;
  for (const k of optionalNotes) {
    if (v[k] !== undefined && typeof v[k] !== "string") return false;
  }
  return true;
}

function isValidState(raw: unknown): raw is AppState {
  if (!isRecord(raw)) return false;
  if (!Array.isArray(raw.pantry)) return false;
  if (!Array.isArray(raw.recipeRows)) return false;
  if (!isRecord(raw.recipeDetails)) return false;
  if (!isStringArray(raw.zutatenScreenRecipeOrder)) return false;
  if (!isRecord(raw.recipeCardExtras)) return false;
  if (!isStringArray(raw.selectedPantryIds)) return false;
  if (!isRecord(raw.recipeRequiredPantryIds)) return false;
  if (!isRecord(raw.recipeRequiredPantryNames)) return false;
  if (typeof raw.groqApiKey !== "string") return false;
  if (typeof raw.shoppingLocationLabel !== "string") return false;
  if (!isStringArray(raw.bookmarkedRecipeIds)) return false;
  if (
    raw.bookmarkAddedAtByRecipeId !== undefined &&
    !isRecord(raw.bookmarkAddedAtByRecipeId)
  ) {
    return false;
  }

  for (const p of raw.pantry) {
    if (!isRecord(p)) return false;
    if (typeof p.id !== "string" || p.id.length === 0) return false;
    if (typeof p.name !== "string" || p.name.length === 0) return false;
    if (!(ICON_CATEGORIES as readonly string[]).includes(String(p.category))) return false;
    if (p.status !== "raw" && p.status !== "precooked" && p.status !== "spice") {
      return false;
    }
    if (typeof p.addedAt !== "number" || !Number.isFinite(p.addedAt)) return false;
    if (p.chipLabel !== undefined && typeof p.chipLabel !== "string") return false;
  }
  for (const r of raw.recipeRows) {
    if (!isRecord(r)) return false;
    if (typeof r.id !== "string" || typeof r.title !== "string") return false;
    if (r.status !== "pantry" && r.status !== "shopping") return false;
    if (typeof r.minutes !== "number" || !Number.isFinite(r.minutes)) return false;
  }
  for (const [k, v] of Object.entries(raw.recipeCardExtras)) {
    if (typeof k !== "string" || !isRecord(v) || typeof v.tag !== "string") return false;
  }
  for (const [k, v] of Object.entries(raw.recipeRequiredPantryIds)) {
    if (typeof k !== "string" || !isStringArray(v)) return false;
  }
  for (const [k, v] of Object.entries(raw.recipeRequiredPantryNames)) {
    if (typeof k !== "string" || !isStringArray(v)) return false;
  }
  if (isRecord(raw.bookmarkAddedAtByRecipeId)) {
    for (const [k, v] of Object.entries(raw.bookmarkAddedAtByRecipeId)) {
      if (typeof k !== "string" || typeof v !== "string") return false;
    }
  }
  for (const d of Object.values(raw.recipeDetails)) {
    if (!isValidRecipeDetail(d)) return false;
  }
  return true;
}

export function loadPersistedState(): AppState {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidState(parsed)) {
      return resetPersistedState();
    }
    const bookmarkAddedAtByRecipeId = isRecord(
      (parsed as { bookmarkAddedAtByRecipeId?: unknown }).bookmarkAddedAtByRecipeId,
    )
      ? ((parsed as { bookmarkAddedAtByRecipeId: Record<string, string> })
          .bookmarkAddedAtByRecipeId ?? {})
      : {};
    const base = parsed as AppState;
    // Storage must not transform/sanitize already-generated recipe display strings.
    // Persisted label values are treated as-is.
    const recipeDetails = base.recipeDetails;
    return {
      ...base,
      recipeDetails,
      bookmarkAddedAtByRecipeId,
    };
  } catch {
    return cloneDefaultState();
  }
}

export function savePersistedState(state: AppState): void {
  try {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function resetPersistedState(): AppState {
  const fresh = cloneDefaultState();
  savePersistedState(fresh);
  return fresh;
}

/** Dev / tests: restore factory defaults without touching localStorage. */
export function getDefaultStateSnapshot(): AppState {
  return cloneDefaultState();
}

export { defaultAppState };
