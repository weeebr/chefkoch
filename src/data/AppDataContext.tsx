/**
 * App data context: manages AppState and exposes actions to the UI.
 * OWNERSHIP: state management and UI action dispatch only.
 * FORBIDDEN: AI output mapping, sanitization, or Swiss normalization.
 * Recipe data from the backend is already typed and sanitized; persist directly.
 */
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
  appendGeneratedRecipesBatch,
  fetchRecipeFromGroqOnce,
} from "../features/groq";
import { GROQ_RECIPES_PER_BATCH } from "../features/groq/groqConstants";
import { recordRateLimitCooldown } from "../features/groq/groqTpmMinuteStore";
import type { AppState } from "./schema";
import { selectMatchingRecipeCards } from "./selectors";
import {
  loadPersistedState,
  resetPersistedState,
  savePersistedState,
} from "./storage";

function uuid(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for runtimes without `crypto.randomUUID` (dev/server edge cases).
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type AppDataContextValue = {
  state: AppState;
  isGeneratingRecipes: boolean;
  pendingGeneratedRecipeSlots: number;
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
  resetAppData: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadPersistedState());
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);
  const [pendingGeneratedRecipeSlots, setPendingGeneratedRecipeSlots] = useState(0);

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
              id: uuid(),
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
      const bookmarkAddedAtByRecipeId = { ...prev.bookmarkAddedAtByRecipeId };
      if (has) {
        delete bookmarkAddedAtByRecipeId[recipeId];
      } else {
        bookmarkAddedAtByRecipeId[recipeId] = new Date().toISOString();
      }
      const next: AppState = {
        ...prev,
        bookmarkedRecipeIds,
        bookmarkAddedAtByRecipeId,
      };
      savePersistedState(next);
      return next;
    });
  }, []);

  const resetAppData = useCallback(() => {
    setState((prev) => {
      const next = resetPersistedState();
      const preserved: AppState = { ...next, groqApiKey: prev.groqApiKey };
      savePersistedState(preserved);
      return preserved;
    });
  }, []);

  const generateRecipesFromPantrySelection = useCallback(
    async (opts?: { willingToShop?: boolean }): Promise<string | null> => {
      const apiKey = state.groqApiKey.trim();
      const selectedIds = [...new Set(state.selectedPantryIds)];
      const willingToShop = opts?.willingToShop ?? false;
      if (!apiKey) {
        return "Kein Groq-API-Schlüssel. Bitte unter Settings eintragen.";
      }
      if (selectedIds.length < 2) {
        return "Wähle mindestens 2 Zutaten aus.";
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
        const pantryLines = selectedPantry.map((p) => ({
          name: p.name,
          category: p.category,
          status: p.status,
        }));

        const totalRecipesToGenerate = GROQ_RECIPES_PER_BATCH;
        setIsGeneratingRecipes(true);
        setPendingGeneratedRecipeSlots(totalRecipesToGenerate);
        const previousRecipeTitles: string[] = [];
        const previousRecipeHints: NonNullable<
          import("../features/groq/groqTypes").RecipeGenerationInput["previousRecipeHints"]
        > = [];

        const selectedPantrySnapshot = selectedPantry.map((p) => ({
          id: p.id,
          name: p.name,
        }));

        setState((prev) => {
          const next = applyGeneratedRecipesBatch(prev, {
            recipes: [],
            selectedPantry: selectedPantrySnapshot,
          });
          savePersistedState(next);
          return next;
        });

        for (let i = 0; i < totalRecipesToGenerate; i++) {
          const result = await fetchRecipeFromGroqOnce(
            apiKey,
            {
              pantryLines,
              willingToShop,
              regionLabel: state.shoppingLocationLabel,
              previousRecipeTitles,
              previousRecipeHints,
            },
            { generationIndex: i, totalRecipesToGenerate },
          );

          setState((prev) => {
            const nextState = appendGeneratedRecipesBatch(prev, {
              recipes: [
                {
                  id: result.id,
                  detail: result.detail,
                  listRow: result.listRow,
                  tag: result.tag,
                },
              ],
              selectedPantry: selectedPantrySnapshot,
            });
            savePersistedState(nextState);
            return nextState;
          });

          setPendingGeneratedRecipeSlots(Math.max(0, totalRecipesToGenerate - (i + 1)));

          previousRecipeTitles.push(result.detail.title);
          previousRecipeHints.push({
            title: result.detail.title,
            tag: result.tag || undefined,
            equipmentNote: result.detail.equipmentNote || undefined,
            flavorNote:
              result.detail.flavorSummaryNote ||
              result.detail.nutritionNote ||
              undefined,
          });
        }
        return null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
        // Groq 429 / TPM: message often includes "Please try again in 4.72 seconds" (or …ms / …s).
        const isRateLimit =
          /Rate limit reached/i.test(msg) ||
          /\b429\b/.test(msg) ||
          /try again in\s+[\d.]+/i.test(msg);
        if (isRateLimit) {
          recordRateLimitCooldown(Date.now(), msg);
        }
        return msg;
      } finally {
        setIsGeneratingRecipes(false);
        setPendingGeneratedRecipeSlots(0);
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
      isGeneratingRecipes,
      pendingGeneratedRecipeSlots,
      addPantryItem,
      removePantryItem,
      updatePantryItem,
      togglePantrySelection,
      setGroqApiKey,
      setShoppingLocationLabel,
      generateRecipesFromPantrySelection,
      matchingRecipeCards,
      toggleBookmarkRecipe,
      resetAppData,
    }),
    [
      state,
      isGeneratingRecipes,
      pendingGeneratedRecipeSlots,
      addPantryItem,
      removePantryItem,
      updatePantryItem,
      togglePantrySelection,
      setGroqApiKey,
      setShoppingLocationLabel,
      generateRecipesFromPantrySelection,
      matchingRecipeCards,
      toggleBookmarkRecipe,
      resetAppData,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
