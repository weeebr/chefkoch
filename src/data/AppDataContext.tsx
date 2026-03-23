import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { IconCategory, PantryIngredient, RecipeMatchCard } from "../types";
import {
  applyGeneratedRecipesBatch,
  fetchRecipesFromGroq,
} from "../features/groq";
import type { AppState } from "./schema";
import { selectMatchingRecipeCards } from "./selectors";
import {
  loadPersistedState,
  resetPersistedStatePreservingGroqKey,
  savePersistedState,
} from "./storage";

type AppDataContextValue = {
  state: AppState;
  addPantryItem: (input: {
    name: string;
    category: IconCategory;
    status: PantryIngredient["status"];
  }) => void;
  removePantryItem: (id: string) => void;
  updatePantryItem: (
    id: string,
    patch: Partial<Pick<PantryIngredient, "name" | "category" | "status">>,
  ) => void;
  togglePantrySelection: (pantryId: string) => void;
  setGroqApiKey: (key: string) => void;
  setShoppingLocationLabel: (label: string) => void;
  /** Returns `null` on success, or a German error message. */
  generateRecipesFromPantrySelection: (opts?: {
    willingToShop?: boolean;
  }) => Promise<string | null>;
  /** Cards for Zutaten → Passende Rezepte (filtered by multi-select + 100% ingredient match). */
  matchingRecipeCards: RecipeMatchCard[];
  toggleBookmarkRecipe: (recipeId: string) => void;
  /** Full reset of persisted app state except `groqApiKey` (pantry, recipes, bookmarks, …). */
  resetAppDataExceptGroqKey: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadPersistedState());

  const addPantryItem = useCallback(
    (input: {
      name: string;
      category: IconCategory;
      status: PantryIngredient["status"];
    }) => {
      const trimmed = input.name.trim();
      if (!trimmed) return;

      setState((prev) => {
        const next: AppState = {
          ...prev,
          pantry: [
            ...prev.pantry,
            {
              id: crypto.randomUUID(),
              name: trimmed,
              category: input.category,
              status: input.status,
              addedAt: Date.now(),
            },
          ],
        };
        savePersistedState(next);
        return next;
      });
    },
    [],
  );

  const removePantryItem = useCallback((id: string) => {
    setState((prev) => {
      const next: AppState = {
        ...prev,
        pantry: prev.pantry.filter((p) => p.id !== id),
        selectedPantryIds: prev.selectedPantryIds.filter((x) => x !== id),
      };
      savePersistedState(next);
      return next;
    });
  }, []);

  const updatePantryItem = useCallback(
    (
      id: string,
      patch: Partial<Pick<PantryIngredient, "name" | "category" | "status">>,
    ) => {
      setState((prev) => {
        const idx = prev.pantry.findIndex((p) => p.id === id);
        if (idx < 0) return prev;
        const cur = prev.pantry[idx]!;
        let name = cur.name;
        if (patch.name !== undefined) {
          const t = patch.name.trim();
          if (!t) return prev;
          name = t;
        }
        const nextRow: PantryIngredient = {
          ...cur,
          name,
          category: patch.category ?? cur.category,
          status: patch.status ?? cur.status,
        };
        if (
          nextRow.name === cur.name &&
          nextRow.category === cur.category &&
          nextRow.status === cur.status
        ) {
          return prev;
        }
        const nextPantry = [...prev.pantry];
        nextPantry[idx] = nextRow;
        const next: AppState = { ...prev, pantry: nextPantry };
        savePersistedState(next);
        return next;
      });
    },
    [],
  );

  const togglePantrySelection = useCallback((pantryId: string) => {
    setState((prev) => {
      const has = prev.pantry.some((p) => p.id === pantryId);
      if (!has) return prev;

      const nextSel = new Set(prev.selectedPantryIds);
      if (nextSel.has(pantryId)) nextSel.delete(pantryId);
      else nextSel.add(pantryId);

      const next: AppState = {
        ...prev,
        selectedPantryIds: [...nextSel],
      };
      savePersistedState(next);
      return next;
    });
  }, []);

  const setGroqApiKey = useCallback((key: string) => {
    setState((prev) => {
      const next: AppState = { ...prev, groqApiKey: key };
      savePersistedState(next);
      return next;
    });
  }, []);

  const setShoppingLocationLabel = useCallback((label: string) => {
    setState((prev) => {
      const next: AppState = { ...prev, shoppingLocationLabel: label };
      savePersistedState(next);
      return next;
    });
  }, []);

  const toggleBookmarkRecipe = useCallback((recipeId: string) => {
    setState((prev) => {
      const has = prev.bookmarkedRecipeIds.includes(recipeId);
      const bookmarkedRecipeIds = has
        ? prev.bookmarkedRecipeIds.filter((id) => id !== recipeId)
        : [...prev.bookmarkedRecipeIds, recipeId];
      const next: AppState = { ...prev, bookmarkedRecipeIds };
      savePersistedState(next);
      return next;
    });
  }, []);

  const resetAppDataExceptGroqKey = useCallback(() => {
    setState((prev) => resetPersistedStatePreservingGroqKey(prev.groqApiKey));
  }, []);

  const generateRecipesFromPantrySelection = useCallback(
    async (opts?: { willingToShop?: boolean }): Promise<string | null> => {
      const key = state.groqApiKey.trim();
      const selectedIds = [...new Set(state.selectedPantryIds)];
      const willingToShop = opts?.willingToShop ?? false;

      if (!key) {
        return "Kein API-Schlüssel. Bitte unter Settings eintragen.";
      }
      if (selectedIds.length === 0) {
        return "Wähle mindestens eine Zutat aus.";
      }

      const pantryById = new Map(state.pantry.map((p) => [p.id, p]));
      const selectedPantry = selectedIds
        .map((id) => pantryById.get(id))
        .filter((p): p is PantryIngredient => p !== undefined)
        .map((p) => ({
          id: p.id,
          name: (p.chipLabel ?? p.name).trim(),
          category: p.category,
          status: p.status,
        }))
        .filter((p) => p.name.length > 0);

      if (selectedPantry.length === 0) {
        return "Keine Zutatendaten für die Auswahl gefunden.";
      }

      try {
        const recipes = await fetchRecipesFromGroq(key, {
          pantryLines: selectedPantry.map((p) => ({
            name: p.name,
            category: p.category,
            status: p.status,
          })),
          willingToShop,
          regionLabel: state.shoppingLocationLabel,
        });

        setState((prev) => {
          const next = applyGeneratedRecipesBatch(prev, {
            recipes,
            selectedPantry: selectedPantry.map((p) => ({
              id: p.id,
              name: p.name,
            })),
            willingToShop,
          });
          savePersistedState(next);
          return next;
        });
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "Unbekannter Fehler.";
      }
    },
    [
      state.groqApiKey,
      state.selectedPantryIds,
      state.pantry,
      state.shoppingLocationLabel,
    ],
  );

  const matchingRecipeCards = useMemo(
    (): RecipeMatchCard[] => selectMatchingRecipeCards(state),
    [
      state.pantry,
      state.recipeCardExtras,
      state.recipeRequiredPantryIds,
      state.recipeRequiredPantryNames,
      state.recipeRows,
      state.selectedPantryIds,
      state.zutatenScreenRecipeOrder,
    ],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      state,
      addPantryItem,
      removePantryItem,
      updatePantryItem,
      togglePantrySelection,
      setGroqApiKey,
      setShoppingLocationLabel,
      generateRecipesFromPantrySelection,
      matchingRecipeCards,
      toggleBookmarkRecipe,
      resetAppDataExceptGroqKey,
    }),
    [
      state,
      addPantryItem,
      removePantryItem,
      updatePantryItem,
      togglePantrySelection,
      setGroqApiKey,
      setShoppingLocationLabel,
      generateRecipesFromPantrySelection,
      matchingRecipeCards,
      toggleBookmarkRecipe,
      resetAppDataExceptGroqKey,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
