import { useEffect, useMemo, useRef } from "react";
import {
  SCREEN_HEADING_CLASS,
  SCREEN_TITLE_ROW_CLASS,
  TAB_SCREEN_MAIN_CLASS,
} from "../components/layout/screenHeading";
import { RecipeMatchCard } from "../components/RecipeMatchCard";
import { RecipeMatchCardSkeleton } from "../components/RecipeMatchCardSkeleton";
import { MaterialIcon } from "../components/MaterialIcon";
import { MissingIngredientsSummary } from "../components/MissingIngredientsSummary";
import { useAppData } from "../data/AppDataContext";
import { selectBookmarkedRowsOrdered } from "../data/selectors";
import { recipeMatchKind, recipeMissingIngredients } from "../data/matchRecipes";
import type { RecipeListRow } from "../types";

type RecipesScreenProps = {
  onOpenRecipe: (recipeId: string) => void;
  onGoToIngredients: () => void;
};

const RECIPES_SCROLL_TARGET_KEY = "chefkoch:recipesScrollTarget";

export function RecipesScreen({
  onOpenRecipe,
  onGoToIngredients,
}: RecipesScreenProps) {
  const savedSectionRef = useRef<HTMLElement | null>(null);
  const {
    state,
    isGeneratingRecipes,
    pendingGeneratedRecipeSlots,
    toggleBookmarkRecipe,
  } = useAppData();
  const recipeListRows = useMemo(
    () => selectBookmarkedRowsOrdered(state),
    [state.bookmarkedRecipeIds, state.recipeRows],
  );

  // Rezepte screen contract:
  // source set is bookmarked recipes only, then split into matching + remaining.
  const matchingBookmarkedRows = useMemo(() => {
    const maxMissing = 2;
    return recipeListRows
      .map((row) => {
        const kind = recipeMatchKind(row.id, state, maxMissing)?.matchKind ?? null;
        return kind
          ? {
              row,
              matchKind: kind,
              missingIngredients: recipeMissingIngredients(row.id, state),
            }
          : null;
      })
      .filter(
        (x): x is { row: RecipeListRow; matchKind: "full" | "partial"; missingIngredients: string[] } =>
          !!x,
      );
  }, [recipeListRows, state]);
  const unmatchedBookmarkedRows = useMemo(() => {
    const maxMissing = 2;
    return recipeListRows
      .map((row) => {
        const kind = recipeMatchKind(row.id, state, maxMissing);
        if (kind) return null;
        return {
          row,
          missingIngredients: recipeMissingIngredients(row.id, state),
        };
      })
      .filter(
        (x): x is { row: RecipeListRow; missingIngredients: string[] } => !!x,
      );
  }, [recipeListRows, state]);
  const hasBookmarkedRecipes = recipeListRows.length > 0;

  useEffect(() => {
    try {
      const target = localStorage.getItem(RECIPES_SCROLL_TARGET_KEY);
      if (target !== "saved") return;
      localStorage.removeItem(RECIPES_SCROLL_TARGET_KEY);
      savedSectionRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className={TAB_SCREEN_MAIN_CLASS}>
      <div className={`${SCREEN_TITLE_ROW_CLASS} flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2">
          <MaterialIcon
            name="bookmark"
            filled
            className="text-[24px] text-on-surface"
          />
          <h2 className={SCREEN_HEADING_CLASS}>Rezepte</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-outline/70">
          {recipeListRows.length}{" "}
          {recipeListRows.length === 1 ? "Rezept" : "Rezepte"}
        </span>
      </div>

      {!hasBookmarkedRecipes && pendingGeneratedRecipeSlots === 0 ? (
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Noch keine gespeicherten Rezepte. Speichere ein Rezept, um es hier
          anzuzeigen.
        </p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                Passende Rezepte ({matchingBookmarkedRows.length})
              </h3>
              {matchingBookmarkedRows.length > 0 ? (
                <button
                  type="button"
                  onClick={onGoToIngredients}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant transition-colors active:text-on-surface"
                >
                  {"→"} andere Zutaten wählen
                </button>
              ) : null}
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/45 px-4 py-3">
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Ausgewählte Zutaten filtern dynamisch passende Rezepte in den Bookmarks
                und auf der Zutaten-Page.
              </p>
              {matchingBookmarkedRows.length === 0 ? (
                <button
                  type="button"
                  onClick={onGoToIngredients}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant transition-colors active:text-on-surface"
                >
                  {"→"} andere Zutaten wählen
                </button>
              ) : null}
            </div>
            <div className="flex flex-col gap-3">
              {matchingBookmarkedRows.map(({ row, matchKind, missingIngredients }) => (
                <RecipeMatchCard
                  key={row.id}
                  title={row.title}
                  minutes={row.minutes}
                  onOpen={() => onOpenRecipe(row.id)}
                  isFullMatch={missingIngredients.length === 0}
                  endMeta={
                    (() => {
                      const extras = state.recipeCardExtras[row.id];
                      if (!extras) {
                        throw new Error(`Invariant violated: missing recipeCardExtras entry for id "${row.id}"`);
                      }
                      const tag = extras.tag;
                      return (
                        <>
                          {missingIngredients.length > 0 ? (
                            <MissingIngredientsSummary names={missingIngredients} />
                          ) : (
                            <span className="truncate font-bold uppercase tracking-tighter text-on-surface-variant">
                              {tag}
                            </span>
                          )}
                        </>
                      );
                    })()
                  }
                  bookmarked
                  onBookmarkToggle={() => toggleBookmarkRecipe(row.id)}
                />
              ))}
              {isGeneratingRecipes
                ? Array.from({ length: pendingGeneratedRecipeSlots }).map((_, i) => (
                    <RecipeMatchCardSkeleton key={`gen-skel-recipes-${i}`} />
                  ))
                : null}
            </div>
          </section>

          <section
            ref={savedSectionRef}
            className="space-y-4 border-t border-outline-variant/20 pt-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                Alle Rezepte ({unmatchedBookmarkedRows.length})
              </h3>
            </div>
            {unmatchedBookmarkedRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-outline-variant/25 px-4 py-4 text-sm leading-relaxed text-on-surface-variant">
                Keine weiteren gespeicherten Rezepte ohne Match.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {unmatchedBookmarkedRows.map(({ row, missingIngredients }) => (
                  <RecipeMatchCard
                    key={row.id}
                    title={row.title}
                    minutes={row.minutes}
                    onOpen={() => onOpenRecipe(row.id)}
                    isFullMatch={false}
                    endMeta={<MissingIngredientsSummary names={missingIngredients} />}
                    bookmarked
                    onBookmarkToggle={() => toggleBookmarkRecipe(row.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
