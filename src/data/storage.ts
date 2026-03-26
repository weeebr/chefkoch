import { APP_STATE_KEY } from "../config/storageKeys";
import { normalizeSwissGroqText } from "../features/groq/swissDisplayText";
import { ICON_CATEGORIES } from "../types";
import { cloneDefaultState, defaultAppState } from "./seed/defaultState";
import type { AppState } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
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

  for (const p of raw.pantry) {
    if (!isRecord(p)) return false;
    if (typeof p.id !== "string" || p.id.length === 0) return false;
    if (typeof p.name !== "string" || p.name.length === 0) return false;
    if (!(ICON_CATEGORIES as readonly string[]).includes(String(p.category))) return false;
    if (p.status !== "raw" && p.status !== "precooked") return false;
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
    return parsed;
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
