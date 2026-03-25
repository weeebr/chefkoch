import { useEffect, useLayoutEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import {
  ACTIVE_SCREEN_KEY,
  DETAIL_SCROLL_RESTORE_KEY,
} from "./config/storageKeys";
import { useAppData } from "./data/AppDataContext";
import type { ActiveScreen } from "./types";
import { IngredientsScreen } from "./pages/IngredientsScreen";
import { RecipeDetailScreen } from "./pages/RecipeDetailScreen";
import { RecipesScreen } from "./pages/RecipesScreen";
import { SettingsScreen } from "./pages/SettingsScreen";

function readStoredScreen(): ActiveScreen {
  try {
    const s = localStorage.getItem(ACTIVE_SCREEN_KEY);
    if (s === "ingredients" || s === "recipes" || s === "settings") {
      return s;
    }
  } catch {
    /* private mode */
  }
  return "ingredients";
}

/**
 * Navigation chrome (active tab, optional recipe overlay id) is local React state + sessionStorage for tab.
 * Recipe/pantry data lives in AppDataContext + localStorage.
 */
export function App() {
  const [screen, setScreen] = useState<ActiveScreen>(readStoredScreen);
  const [recipeDetailId, setRecipeDetailId] = useState<string | null>(null);
  const { state } = useAppData();

  const clearDetailScrollRestore = () => {
    try {
      localStorage.removeItem(DETAIL_SCROLL_RESTORE_KEY);
    } catch {
      /* ignore */
    }
  };

  type ScrollRestorePayload = { y: number; screen: ActiveScreen };

  const readDetailScrollRestore = (): ScrollRestorePayload | null => {
    try {
      const raw = localStorage.getItem(DETAIL_SCROLL_RESTORE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      const p = parsed as Partial<ScrollRestorePayload>;
      if (typeof p.y !== "number" || !Number.isFinite(p.y)) return null;
      if (p.screen !== "ingredients" && p.screen !== "recipes" && p.screen !== "settings") return null;
      return { y: p.y, screen: p.screen };
    } catch {
      return null;
    }
  };

  const saveDetailScrollRestore = (y: number) => {
    try {
      const payload: ScrollRestorePayload = { y, screen };
      localStorage.setItem(DETAIL_SCROLL_RESTORE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    // Persist the active tab even while RecipeDetail overlay is open.
    try {
      localStorage.setItem(ACTIVE_SCREEN_KEY, screen);
    } catch {
      /* ignore */
    }
  }, [screen]);

  useEffect(() => {
    if (!recipeDetailId) return;
    if (!state.recipeDetails[recipeDetailId]) {
      setRecipeDetailId(null);
    }
  }, [recipeDetailId, state.recipeDetails]);

  /** List screens scroll the document; opening detail should start at the top. */
  useLayoutEffect(() => {
    if (!recipeDetailId) return;
    window.scrollTo(0, 0);
  }, [recipeDetailId]);

  /** Restore previous scroll position after closing detail (or on refresh). */
  useLayoutEffect(() => {
    if (recipeDetailId) return;
    const payload = readDetailScrollRestore();
    if (!payload) return;
    if (payload.screen !== screen) return;
    window.scrollTo(0, payload.y);
    clearDetailScrollRestore();
  }, [recipeDetailId, screen]);

  const handleNavigate = (next: ActiveScreen) => {
    setScreen(next);
    setRecipeDetailId(null);
    clearDetailScrollRestore();
  };

  return (
    <AppShell screen={screen} onNavigate={handleNavigate}>
      {!recipeDetailId && screen === "ingredients" && (
        <IngredientsScreen
          onOpenRecipe={(id) => {
            saveDetailScrollRestore(window.scrollY);
            setRecipeDetailId(id);
          }}
        />
      )}
      {!recipeDetailId && screen === "recipes" && (
        <RecipesScreen
          onOpenRecipe={(id) => {
            saveDetailScrollRestore(window.scrollY);
            setRecipeDetailId(id);
          }}
        />
      )}
      {recipeDetailId && (
        <RecipeDetailScreen
          key={recipeDetailId}
          recipeId={recipeDetailId}
          backLabel={
            screen === "ingredients"
              ? "Zurück zu Zutaten"
              : "Zurück zu Rezepten"
          }
          onBack={() => setRecipeDetailId(null)}
        />
      )}
      {!recipeDetailId && screen === "settings" && <SettingsScreen />}
    </AppShell>
  );
}
