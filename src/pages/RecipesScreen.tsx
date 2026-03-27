import { useEffect, useMemo, useRef, useState } from "react";
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
const RECIPES_SORT_MODE_KEY = "chefkoch:recipesSortMode";
type BookmarkSortMode = "lastBookmarked" | "totalCookingTime";

function readStoredSortMode(): BookmarkSortMode {
  try {
    const raw = localStorage.getItem(RECIPES_SORT_MODE_KEY);
    if (raw === "lastBookmarked" || raw === "totalCookingTime") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "lastBookmarked";
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  const source = haystack.trim().toLowerCase();
  const query = needle.trim().toLowerCase();
  if (!query) return true;
  let needleIdx = 0;
  for (let i = 0; i < source.length && needleIdx < query.length; i++) {
    if (source[i] === query[needleIdx]) needleIdx += 1;
  }
  return needleIdx === query.length;
}

export function RecipesScreen({
  onOpenRecipe,
  onGoToIngredients,
}: RecipesScreenProps) {
  const savedSectionRef = useRef<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<BookmarkSortMode>(readStoredSortMode);
  const {
    state,
    isGeneratingRecipes,
    pendingGeneratedRecipeSlots,
    toggleBookmarkRecipe,
  } = useAppData();
  const recipeListRows = useMemo(
    () => selectBookmarkedRowsOrdered(state),
    [state.bookmarkedRecipeIds, state.recipeRows, state.bookmarkAddedAtByRecipeId],
  );
  const filteredAndSortedRecipeListRows = useMemo(() => {
    const bySearch = recipeListRows.filter((row) => fuzzyIncludes(row.title, searchQuery));
    const bySort = [...bySearch];
    bySort.sort((a, b) => {
      if (sortMode === "totalCookingTime") {
        if (a.minutes !== b.minutes) return a.minutes - b.minutes;
        return a.title.localeCompare(b.title, "de");
      }
      const aTime = Date.parse(state.bookmarkAddedAtByRecipeId[a.id] ?? "");
      const bTime = Date.parse(state.bookmarkAddedAtByRecipeId[b.id] ?? "");
      const aScore = Number.isFinite(aTime) ? aTime : 0;
      const bScore = Number.isFinite(bTime) ? bTime : 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.title.localeCompare(b.title, "de");
    });
    return bySort;
  }, [recipeListRows, searchQuery, sortMode, state.bookmarkAddedAtByRecipeId]);

  // Rezepte screen contract:
  // source set is bookmarked recipes only, then split into matching + remaining.
  const matchingBookmarkedRows = useMemo(() => {
    const maxMissing = 2;
    return filteredAndSortedRecipeListRows
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
  }, [filteredAndSortedRecipeListRows, state]);
  const unmatchedBookmarkedRows = useMemo(() => {
    const maxMissing = 2;
    return filteredAndSortedRecipeListRows
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
  }, [filteredAndSortedRecipeListRows, state]);
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

  useEffect(() => {
    try {
      localStorage.setItem(RECIPES_SORT_MODE_KEY, sortMode);
    } catch {
      /* ignore */
    }
  }, [sortMode]);

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

      <div className="mb-12 flex items-center gap-2">
        <label htmlFor="recipes-search" className="sr-only">
          Rezepte suchen
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            id="recipes-search"
            className="w-full rounded-xl border border-outline-variant/15 bg-surface-container-low py-2.5 pl-10 pr-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
            placeholder="Rezepte suchen …"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70">
            <MaterialIcon name="search" className="text-xl" />
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setSortMode((prev) =>
              prev === "lastBookmarked" ? "totalCookingTime" : "lastBookmarked",
            )
          }
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-outline-variant/15 bg-surface-container-low px-2 text-on-surface-variant transition-colors active:bg-surface-container-high"
          aria-label={
            sortMode === "lastBookmarked"
              ? "Sortierung: zuletzt gespeichert"
              : "Sortierung: Gesamtkochzeit"
          }
          title={
            sortMode === "lastBookmarked"
              ? "Sortierung: zuletzt gespeichert"
              : "Sortierung: Gesamtkochzeit"
          }
        >
          <MaterialIcon
            name={sortMode === "lastBookmarked" ? "arrow_downward" : "arrow_upward"}
            className="text-[20px]"
          />
          <span className="font-label text-[10px] font-bold uppercase tracking-wide">
            {sortMode === "lastBookmarked"
              ? "Zuletzt hinzugefügt"
              : "Kochzeit"}
          </span>
        </button>
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
