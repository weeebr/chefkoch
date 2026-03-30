import {
  INGREDIENTS_SCREEN_MAIN_CLASS,
  SCREEN_HEADING_CLASS,
  SCREEN_TITLE_ROW_CLASS,
} from "../components/layout/screenHeading";
import { MaterialIcon } from "../components/MaterialIcon";
import { MissingIngredientsSummary } from "../components/MissingIngredientsSummary";
import { RecipeMatchCardSkeleton } from "../components/RecipeMatchCardSkeleton";
import {
  chipButtonClassName,
  chipIconClassName,
  chipLabelClassName,
  ingredientSectionHeadingClass,
} from "../components/ingredients/ingredientChipStyles";
import { RecipeMatchCard } from "../components/RecipeMatchCard";
import { InfoHintButton } from "../components/InfoHintButton";
import { useAppData } from "../data/AppDataContext";
import { materialIconForCategory } from "../data/iconFromCategory";
import { GenerateRecipesPanel } from "../features/groq/GenerateRecipesPanel";
import type { IconCategory, IngredientChipItem } from "../types";
import { GROQ_RECIPES_PER_BATCH } from "../features/groq/groqConstants";
import { arrowNavLinkClassName } from "../components/link/linkArrowStyles";

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

type IngredientsScreenProps = {
  onOpenRecipe: (recipeId: string) => void;
  onGoToRecipes: (target?: "saved") => void;
};

export function IngredientsScreen({
  onOpenRecipe,
  onGoToRecipes,
}: IngredientsScreenProps) {
  const {
    state,
    isGeneratingRecipes,
    pendingGeneratedRecipeSlots,
    matchingRecipeCards,
    togglePantrySelection,
    toggleBookmarkRecipe,
  } = useAppData();
  const selected = new Set(state.selectedPantryIds);
  const bucketOrder: IconCategory[] = [
    "Tiefkühl",
    "Kühlschrank",
    "Vorratsschrank",
  ];
  const categoryOrder = new Map(bucketOrder.map((c, i) => [c, i]));
  const byBucketThenNewestFirst = (
    a: (typeof state.pantry)[number],
    b: (typeof state.pantry)[number],
  ) => {
    const ia = categoryOrder.get(a.category) ?? 999;
    const ib = categoryOrder.get(b.category) ?? 999;
    if (ia !== ib) return ia - ib;
    return b.addedAt - a.addedAt;
  };
  const toChip = (p: (typeof state.pantry)[number]): IngredientChipItem => ({
    id: p.id,
    name: p.chipLabel ?? p.name,
    category: p.category,
  });
  const preCookedChips: IngredientChipItem[] = state.pantry
    .filter((p) => p.status === "precooked")
    .sort(byBucketThenNewestFirst)
    .map(toChip);
  const notPreCookedChips: IngredientChipItem[] = state.pantry
    .filter((p) => p.status === "raw")
    .sort(byBucketThenNewestFirst)
    .map(toChip);
  const spiceChips: IngredientChipItem[] = state.pantry
    .filter((p) => p.status === "spice")
    .sort(byBucketThenNewestFirst)
    .map(toChip);
  const notPreCookedItemCount = notPreCookedChips.length;
  const spiceItemCount = spiceChips.length;

  const newestGeneratedIds = new Set(
    state.zutatenScreenRecipeOrder.slice(0, GROQ_RECIPES_PER_BATCH),
  );
  // Zutaten screen contract:
  // 1) newly generated matching recipes first (not yet bookmarked)
  // 2) matching bookmarked recipes second
  const [newlyGeneratedRecipeCards, matchingBookmarkedRecipeCards] = (() => {
    const generated: typeof matchingRecipeCards = [];
    const bookmarked: typeof matchingRecipeCards = [];
    for (const card of matchingRecipeCards) {
      const isBookmarked = state.bookmarkedRecipeIds.includes(card.id);
      const isNewestGenerated = newestGeneratedIds.has(card.id);
      if (isBookmarked) {
        bookmarked.push(card);
      } else if (isNewestGenerated) {
        generated.push(card);
      }
    }
    return [generated, bookmarked] as const;
  })();

  const zutatenOrder = state.zutatenScreenRecipeOrder;
  const batchStart = Math.max(0, zutatenOrder.length - GROQ_RECIPES_PER_BATCH);
  const newRecipeSlotIds = Array.from(
    { length: GROQ_RECIPES_PER_BATCH },
    (_, i) => {
      return zutatenOrder[batchStart + i];
    },
  );
  const newlyGeneratedById = new Map(
    newlyGeneratedRecipeCards.map((c) => [c.id, c]),
  );

  return (
    <main className={`${INGREDIENTS_SCREEN_MAIN_CLASS} space-y-10`}>
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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={`inline-flex items-center gap-1 ${ingredientSectionHeadingClass}`}
          >
            <span>Gewürze</span>
            <InfoHintButton
              label="Hinweis zu Gewürze-Regel"
              text="Ausgewählte Gewürze werden immer als optional behandelt, auch wenn 'alle ausgewählte Zutaten verwenden' ausgewählt ist"
              popoverAlign="left"
            />
          </h3>
          <span className="text-xs font-semibold tabular-nums text-on-secondary-fixed-variant">
            {spiceItemCount} Einträge
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {spiceChips.map((item) => (
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
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Neue Rezepte ({newlyGeneratedRecipeCards.length})
          </h3>
        </div>
        {newlyGeneratedRecipeCards.length === 0 &&
        matchingBookmarkedRecipeCards.length === 0 &&
        pendingGeneratedRecipeSlots === 0 ? (
          <p className="rounded-xl border border-dashed border-primary/20 px-4 py-8 text-center text-sm leading-relaxed text-on-surface-variant">
            Noch keine Rezepte generiert. <br />
            Wähle deine Zutaten oben aus, dann klicke auf &quot;Neue Rezepte
            generieren&quot;
          </p>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {newlyGeneratedRecipeCards.map((card) => {
                  const bookmarked = state.bookmarkedRecipeIds.includes(
                    card.id,
                  );
                  return (
                    <RecipeMatchCard
                      key={card.id}
                      title={card.title}
                      minutes={card.minutes}
                      onOpen={() => onOpenRecipe(card.id)}
                      isFullMatch={card.missingIngredients.length === 0}
                      endMeta={
                        card.missingIngredients.length > 0 ? (
                          <MissingIngredientsSummary
                            names={card.missingIngredients}
                          />
                        ) : (
                          <span className="truncate font-bold uppercase tracking-tighter text-on-surface-variant">
                            {card.tag}
                          </span>
                        )
                      }
                      bookmarked={bookmarked}
                      onBookmarkToggle={() => {
                        toggleBookmarkRecipe(card.id);
                      }}
                    />
                  );
                })}
                {isGeneratingRecipes
                  ? Array.from({ length: pendingGeneratedRecipeSlots }).map(
                      (_, i) => (
                        <RecipeMatchCardSkeleton
                          key={`gen-skel-ingredients-${i}`}
                        />
                      ),
                    )
                  : null}
              </div>
            </div>

            <div className="space-y-3 border-t border-outline-variant/20 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Gespeicherte Rezepte ({matchingBookmarkedRecipeCards.length})
                </h4>
                <button
                  type="button"
                  onClick={() => onGoToRecipes("saved")}
                  className={arrowNavLinkClassName}
                >
                  {"→"} Alle Rezepte
                </button>
              </div>
              {state.bookmarkedRecipeIds.length === 0 ? (
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  Noch keine gespeicherten Rezepte. Speichere ein Rezept, um es
                  hier anzuzeigen.
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3">
                {matchingBookmarkedRecipeCards.map((card) => {
                  const bookmarked = state.bookmarkedRecipeIds.includes(
                    card.id,
                  );
                  return (
                    <RecipeMatchCard
                      key={card.id}
                      title={card.title}
                      minutes={card.minutes}
                      onOpen={() => onOpenRecipe(card.id)}
                      isFullMatch={card.missingIngredients.length === 0}
                      endMeta={
                        card.missingIngredients.length > 0 ? (
                          <MissingIngredientsSummary
                            names={card.missingIngredients}
                          />
                        ) : (
                          <span className="truncate font-bold uppercase tracking-tighter text-on-surface-variant">
                            {card.tag}
                          </span>
                        )
                      }
                      bookmarked={bookmarked}
                      onBookmarkToggle={() => {
                        toggleBookmarkRecipe(card.id);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
