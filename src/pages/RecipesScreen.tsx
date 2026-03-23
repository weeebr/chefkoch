import { useMemo } from "react";
import {
  SCREEN_HEADING_CLASS,
  SCREEN_TITLE_ROW_CLASS,
  TAB_SCREEN_MAIN_CLASS,
} from "../components/layout/screenHeading";
import { RecipeMatchCard } from "../components/RecipeMatchCard";
import { MaterialIcon } from "../components/MaterialIcon";
import { MissingIngredientsSummary } from "../components/MissingIngredientsSummary";
import { useAppData } from "../data/AppDataContext";
import { selectBookmarkedRowsOrdered } from "../data/selectors";
import { recipeMatchKind, recipeMissingIngredients } from "../data/matchRecipes";
import type { RecipeListRow } from "../types";

type RecipesScreenProps = {
  onOpenRecipe: (recipeId: string) => void;
};

export function RecipesScreen({ onOpenRecipe }: RecipesScreenProps) {
  const { state, toggleBookmarkRecipe } = useAppData();
  const recipeListRows = useMemo(
    () => selectBookmarkedRowsOrdered(state),
    [state.bookmarkedRecipeIds, state.recipeRows],
  );

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

  return (
    <main className={TAB_SCREEN_MAIN_CLASS}>
      <div className={SCREEN_TITLE_ROW_CLASS}>
        <h2 className={SCREEN_HEADING_CLASS}>Rezepte</h2>
      </div>

      {matchingBookmarkedRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline-variant/25 px-4 py-8 text-center text-sm leading-relaxed text-on-surface-variant">
          Noch keine gespeicherten Rezepte. Öffne ein Rezept und tippe auf das
          Lesezeichen, um es hier anzuzeigen.
        </p>
      ) : (
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
                  const tag = state.recipeCardExtras[row.id]?.tag ?? "—";
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
        </div>
      )}

      <div className="mt-10 px-2 text-[10px] font-bold uppercase tracking-widest text-outline/70">
        <span>
          {matchingBookmarkedRows.length}{" "}
          {matchingBookmarkedRows.length === 1 ? "Rezept" : "Rezepte"}
        </span>
      </div>
    </main>
  );
}
