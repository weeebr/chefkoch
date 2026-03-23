import { useEffect, useLayoutEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ACTIVE_SCREEN_KEY } from "./config/storageKeys";
import { useAppData } from "./data/AppDataContext";
import type { ActiveScreen } from "./types";
import { IngredientsScreen } from "./pages/IngredientsScreen";
import { RecipeDetailScreen } from "./pages/RecipeDetailScreen";
import { RecipesScreen } from "./pages/RecipesScreen";
import { SettingsScreen } from "./pages/SettingsScreen";

function readStoredScreen(): ActiveScreen {
  try {
    const s = sessionStorage.getItem(ACTIVE_SCREEN_KEY);
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

  useEffect(() => {
    if (!recipeDetailId) return;
    if (!state.recipeDetails[recipeDetailId]) {
      setRecipeDetailId(null);
    }
  }, [recipeDetailId, state.recipeDetails]);

  /** List screens scroll the document; opening detail must start at the top. */
  useLayoutEffect(() => {
    if (!recipeDetailId) return;
    window.scrollTo(0, 0);
  }, [recipeDetailId]);

  const handleNavigate = (next: ActiveScreen) => {
    setScreen(next);
    setRecipeDetailId(null);
    try {
      sessionStorage.setItem(ACTIVE_SCREEN_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <AppShell screen={screen} onNavigate={handleNavigate}>
      {!recipeDetailId && screen === "ingredients" && (
        <IngredientsScreen onOpenRecipe={(id) => setRecipeDetailId(id)} />
      )}
      {!recipeDetailId && screen === "recipes" && (
        <RecipesScreen onOpenRecipe={(id) => setRecipeDetailId(id)} />
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
