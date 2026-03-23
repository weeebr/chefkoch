import {
  SCREEN_HEADING_CLASS,
  SCREEN_TITLE_ROW_CLASS,
  TAB_SCREEN_MAIN_CLASS,
} from "../components/layout/screenHeading";
import { MaterialIcon } from "../components/MaterialIcon";
import {
  chipButtonClassName,
  chipIconClassName,
  chipLabelClassName,
  ingredientSectionHeadingClass,
} from "../components/ingredients/ingredientChipStyles";
import { RecipeMatchCard } from "../components/RecipeMatchCard";
import { useAppData } from "../data/AppDataContext";
import { materialIconForCategory } from "../data/iconFromCategory";
import { GenerateRecipesPanel } from "../features/groq/GenerateRecipesPanel";
import {
  BOOKMARK_FEEDBACK_REMOVED,
  BOOKMARK_FEEDBACK_SAVED,
} from "../hooks/bookmarkStrings";
import { useAutoClearMessage } from "../hooks/useAutoClearMessage";
import type { IngredientChipItem } from "../types";

function ChipButton({
  item,
  selected,
  onToggle,
}: {
  item: IngredientChipItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={chipButtonClassName(selected)}
    >
      <MaterialIcon
        name={materialIconForCategory(item.category)}
        className={chipIconClassName(selected)}
      />
      <span className={chipLabelClassName(selected)}>{item.name}</span>
    </button>
  );
}

function truncateMissingIngredients(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]}, ...`;
}

type IngredientsScreenProps = {
  onOpenRecipe: (recipeId: string) => void;
};

export function IngredientsScreen({ onOpenRecipe }: IngredientsScreenProps) {
  const {
    state,
    matchingRecipeCards,
    togglePantrySelection,
    toggleBookmarkRecipe,
  } = useAppData();
  const selected = new Set(state.selectedPantryIds);
  const byNewestFirst = (a: { addedAt: number }, b: { addedAt: number }) =>
    b.addedAt - a.addedAt;
  const toChip = (p: (typeof state.pantry)[number]): IngredientChipItem => ({
    id: p.id,
    name: p.chipLabel ?? p.name,
    category: p.category,
  });
  const preCookedChips: IngredientChipItem[] = state.pantry
    .filter((p) => p.status === "precooked")
    .sort(byNewestFirst)
    .map(toChip);
  const notPreCookedChips: IngredientChipItem[] = state.pantry
    .filter((p) => p.status === "raw")
    .sort(byNewestFirst)
    .map(toChip);
  const notPreCookedItemCount = notPreCookedChips.length;

  const { message: bookmarkFeedback, showMessage: showBookmarkFeedback } =
    useAutoClearMessage(2800);

  return (
    <main className={`${TAB_SCREEN_MAIN_CLASS} space-y-10`}>
      <div className={SCREEN_TITLE_ROW_CLASS}>
        <h2 className={SCREEN_HEADING_CLASS}>Zutaten</h2>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={ingredientSectionHeadingClass}>Ready / Vorgekocht</h3>
          <span className="text-xs font-semibold tabular-nums text-on-secondary-fixed-variant">
            {preCookedChips.length} Einträge
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {preCookedChips.map((item) => (
            <ChipButton
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => togglePantrySelection(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={ingredientSectionHeadingClass}>Prep nötig</h3>
          <span className="text-xs font-semibold tabular-nums text-on-secondary-fixed-variant">
            {notPreCookedItemCount} Einträge
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {notPreCookedChips.map((item) => (
            <ChipButton
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={() => togglePantrySelection(item.id)}
            />
          ))}
        </div>
      </section>

      <GenerateRecipesPanel />

      <section className="space-y-6 border-t border-primary/15 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary-dim">
            Passende Rezepte
          </h3>
          <span className="text-xs font-semibold tabular-nums text-primary/75">
            {matchingRecipeCards.length} Treffer
          </span>
        </div>
        {matchingRecipeCards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary/20 px-4 py-8 text-center text-sm leading-relaxed text-on-surface-variant">
            Keine Treffer. Wähle Zutaten aus dem Vorrat — es werden auch Rezepte
            angezeigt, bei denen bis zu 2 Zutaten fehlen.
          </p>
        ) : (
          <div className="space-y-3">
            {bookmarkFeedback ? (
              <p
                className="text-sm font-medium text-primary"
                role="status"
                aria-live="polite"
              >
                {bookmarkFeedback}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3">
              {matchingRecipeCards.map((card) => {
                const bookmarked = state.bookmarkedRecipeIds.includes(card.id);
                return (
                  <RecipeMatchCard
                    key={card.id}
                    title={card.title}
                    minutes={card.minutes}
                    onOpen={() => onOpenRecipe(card.id)}
                    isFullMatch={card.missingIngredients.length === 0}
                    endMeta={
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {card.missingIngredients.length > 0 ? (
                          <>
                            <MaterialIcon
                              name="shopping_cart"
                              className="shrink-0 text-[14px] text-primary-dim"
                            />
                            <span className="text-xs font-bold uppercase tracking-tighter text-primary-dim">
                              {truncateMissingIngredients(
                                card.missingIngredients,
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold uppercase tracking-tighter text-on-surface-variant">
                            {card.tag}
                          </span>
                        )}
                      </span>
                    }
                    bookmarked={bookmarked}
                    onBookmarkToggle={() => {
                      showBookmarkFeedback(
                        bookmarked
                          ? BOOKMARK_FEEDBACK_REMOVED
                          : BOOKMARK_FEEDBACK_SAVED,
                      );
                      toggleBookmarkRecipe(card.id);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
