import { useEffect, useLayoutEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import {
  ACTIVE_SCREEN_KEY,
  DETAIL_SCROLL_RESTORE_KEY,
  ACTIVE_DETAIL_RECIPE_ID_KEY,
} from "./config/storageKeys";
import { useAppData } from "./data/AppDataContext";
import type { ActiveScreen } from "./types";
import { IngredientsScreen } from "./pages/IngredientsScreen";
import { RecipeDetailScreen } from "./pages/RecipeDetailScreen";
import { RecipesScreen } from "./pages/RecipesScreen";
import { SettingsScreen } from "./pages/SettingsScreen";
import { GROQ_RECIPES_PER_BATCH } from "./features/groq/groqConstants";

const RECIPES_SCROLL_TARGET_KEY = "chefkoch:recipesScrollTarget";

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

function readStoredActiveDetailRecipeId(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_DETAIL_RECIPE_ID_KEY);
    if (raw && typeof raw === "string") return raw;
  } catch {
    /* private mode */
  }
  return null;
}

/**
 * Navigation chrome (active tab, optional recipe overlay id) is local React state + sessionStorage for tab.
 * Recipe/pantry data lives in AppDataContext + localStorage.
 */
export function App() {
  const [screen, setScreen] = useState<ActiveScreen>(readStoredScreen);
  const [recipeDetailId, setRecipeDetailId] = useState<string | null>(
    () => readStoredActiveDetailRecipeId(),
  );
  const { state } = useAppData();
  const validScreens = new Set<ActiveScreen>(["ingredients", "recipes", "settings"]);

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

  const clearActiveDetailRecipeId = () => {
    try {
      localStorage.removeItem(ACTIVE_DETAIL_RECIPE_ID_KEY);
    } catch {
      /* ignore */
    }
  };

  const saveActiveDetailRecipeId = (id: string) => {
    try {
      localStorage.setItem(ACTIVE_DETAIL_RECIPE_ID_KEY, id);
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
    const onNavigate = (ev: Event) => {
      const custom = ev as CustomEvent<{ screen?: ActiveScreen; focusId?: string }>;
      const targetScreen = custom.detail?.screen;
      if (!targetScreen) return;
      setRecipeDetailId(null);
      clearActiveDetailRecipeId();
      clearDetailScrollRestore();
      setScreen(targetScreen);

      const focusId = custom.detail?.focusId;
      if (!focusId) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const el = document.getElementById(focusId);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          if ("focus" in el && typeof el.focus === "function") {
            (el as HTMLElement).focus();
          }
        });
      });
    };

    window.addEventListener("chefkoch:navigate", onNavigate as EventListener);
    return () =>
      window.removeEventListener("chefkoch:navigate", onNavigate as EventListener);
  }, []);

  useEffect(() => {
    const currentScreen = screen as unknown;
    if (!validScreens.has(currentScreen as ActiveScreen)) {
      setScreen("ingredients");
      setRecipeDetailId(null);
      clearActiveDetailRecipeId();
      clearDetailScrollRestore();
      return;
    }
    if (!recipeDetailId) return;
    if (!state.recipeDetails[recipeDetailId]) {
      setRecipeDetailId(null);
      setScreen("ingredients");
      clearActiveDetailRecipeId();
      clearDetailScrollRestore();
    }
  }, [recipeDetailId, screen, state.recipeDetails]);

  const newestGeneratedUnbookmarkedIds = state.zutatenScreenRecipeOrder
    .slice(0, GROQ_RECIPES_PER_BATCH)
    .filter((id) => !state.bookmarkedRecipeIds.includes(id));
  const currentGeneratedIndex = recipeDetailId
    ? newestGeneratedUnbookmarkedIds.indexOf(recipeDetailId)
    : -1;
  const nextGeneratedRecipeId =
    currentGeneratedIndex >= 0
      ? newestGeneratedUnbookmarkedIds[currentGeneratedIndex + 1] ?? null
      : null;
  const hasRenderableDetail = !!(recipeDetailId && state.recipeDetails[recipeDetailId]);

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
    clearActiveDetailRecipeId();
  };

  return (
    <AppShell screen={screen} onNavigate={handleNavigate}>
      {!hasRenderableDetail && screen === "ingredients" && (
        <IngredientsScreen
          onGoToRecipes={(target) => {
            if (target === "saved") {
              try {
                localStorage.setItem(RECIPES_SCROLL_TARGET_KEY, "saved");
              } catch {
                /* ignore */
              }
            }
            setScreen("recipes");
          }}
          onOpenRecipe={(id) => {
            saveDetailScrollRestore(window.scrollY);
            saveActiveDetailRecipeId(id);
            setRecipeDetailId(id);
          }}
        />
      )}
      {!hasRenderableDetail && screen === "recipes" && (
        <RecipesScreen
          onGoToIngredients={() => setScreen("ingredients")}
          onOpenRecipe={(id) => {
            saveDetailScrollRestore(window.scrollY);
            saveActiveDetailRecipeId(id);
            setRecipeDetailId(id);
          }}
        />
      )}
      {hasRenderableDetail && recipeDetailId && (
        <RecipeDetailScreen
          key={recipeDetailId}
          recipeId={recipeDetailId}
          backLabel={
            screen === "ingredients"
              ? "Zurück zu Zutaten"
              : "Zurück zu Rezepten"
          }
          onBack={() => {
            setRecipeDetailId(null);
            clearActiveDetailRecipeId();
          }}
          canGoNext={Boolean(nextGeneratedRecipeId)}
          onNextRecipe={
            nextGeneratedRecipeId
              ? () => {
                  saveActiveDetailRecipeId(nextGeneratedRecipeId);
                  setRecipeDetailId(nextGeneratedRecipeId);
                }
              : undefined
          }
        />
      )}
      {!hasRenderableDetail && screen === "settings" && <SettingsScreen />}
    </AppShell>
  );
}
