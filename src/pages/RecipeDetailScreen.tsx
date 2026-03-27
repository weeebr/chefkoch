import { useMemo } from "react";
import { SCREEN_HEADING_CLASS } from "../components/layout/screenHeading";
import { MaterialIcon } from "../components/MaterialIcon";
import { InfoHintButton } from "../components/InfoHintButton";
import {
  ingredientTableHeaderRowClass,
  ingredientWarmPanelClass,
  ingredientShoppingWarmPanelClass,
  ingredientShoppingTableHeaderRowClass,
  ingredientShoppingTableBodyDivideClass,
} from "../components/ingredients/ingredientChipStyles";
import { RecipeScalingSection } from "../components/recipe/RecipeScalingSection";
import { useAppData } from "../data/AppDataContext";
import { normalizeIngredientLabel } from "../data/ingredientLabel";
import { useBookmarkRecipe } from "../hooks/useBookmarkRecipe";
import { useRecipeScaling } from "../hooks/useRecipeScaling";
import { scaleMeasurementQuantitiesInText } from "../utils/scaleQuantityString";

type RecipeDetailScreenProps = {
  recipeId: string;
  onBack: () => void;
  onNextRecipe?: () => void;
  canGoNext?: boolean;
  /** Shown next to the back arrow (e.g. which tab we return to). */
  backLabel: string;
};

function formatMinutes(n: number): string {
  if (n <= 0) return "—";
  return `${n} Min.`;
}

function formatBookmarkDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function RecipeDetailScreen({
  recipeId,
  onBack,
  onNextRecipe,
  canGoNext = false,
  backLabel,
}: RecipeDetailScreenProps) {
  const { state } = useAppData();
  const {
    bookmarked,
    toggleBookmark,
    feedbackMessage: bookmarkFeedback,
    bookmarkAriaLabel,
  } = useBookmarkRecipe(recipeId);
  const detail = useMemo(() => {
    const d = state.recipeDetails[recipeId];
    if (!d) {
      throw new Error(`Missing recipe detail for id "${recipeId}"`);
    }
    return d;
  }, [recipeId, state.recipeDetails]);
  const detailTag = state.recipeCardExtras[recipeId]?.tag?.trim() || "";
  const bookmarkAddedAt = state.bookmarkAddedAtByRecipeId[recipeId];
  const dynamicLinksHint =
    "Zuvor ausgewählte Zutaten wirken sich dynamisch auf die Zutatenliste alle Rezepte aus. Wurde eine Zutat eines Rezepts davor nicht ausgewählt, so wandert sie in die Einkaufsliste darüber.";

  const {
    setScalingId,
    resolvedMode,
    scaleFactor,
    basePortions,
    displayPortions,
    displayPercent,
    displayIngredients,
    setPortionsFromInput,
    setPercentFromInput,
  } = useRecipeScaling(detail, recipeId);
  const alternativesByIngredient = useMemo(() => {
    const out = new Map<string, string>();
    const raw = detail.shoppingAlternativesNote;
    if (!raw) return out;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(":");
      if (idx < 1) continue;
      const ingredient = trimmed.slice(0, idx).trim();
      const alternatives = trimmed.slice(idx + 1).trim();
      if (!ingredient || !alternatives) continue;
      out.set(normalizeIngredientLabel(ingredient), alternatives);
    }
    return out;
  }, [detail.shoppingAlternativesNote]);

  const [shoppingDisplayIngredients, selectedDisplayIngredients] = useMemo(() => {
    // In shopping mode, the "Einkaufen" list should reflect what the user does
    // NOT currently have selected. So we classify recipe ingredient rows using
    // the current pantry selection (chipLabel ?? name) rather than generation-time
    // required labels.
    const pantryById = new Map(state.pantry.map((p) => [p.id, p]));
    const selectedIds = new Set(state.selectedPantryIds);
    const selectedCounts = new Map<string, number>();
    for (const pid of selectedIds) {
      const p = pantryById.get(pid);
      if (!p) continue;
      const key = normalizeIngredientLabel(p.chipLabel ?? p.name);
      if (!key) continue;
      selectedCounts.set(key, (selectedCounts.get(key) ?? 0) + 1);
    }

    const shopping: typeof displayIngredients = [];
    const selected: typeof displayIngredients = [];

    for (let i = 0; i < detail.ingredients.length; i++) {
      const ingredient = detail.ingredients[i]!;
      const base = ingredient.component.split(/[,(]/)[0]?.trim() ?? "";
      const key = normalizeIngredientLabel(base);

      if ((selectedCounts.get(key) ?? 0) > 0) {
        selectedCounts.set(key, (selectedCounts.get(key) ?? 0) - 1);
        selected.push(displayIngredients[i]!);
      } else {
        shopping.push(displayIngredients[i]!);
      }
    }

    return [shopping, selected] as const;
  }, [detail.ingredients, displayIngredients, state.pantry, state.selectedPantryIds]);
  const isFullMatch = shoppingDisplayIngredients.length === 0;
  const accentTextClass = isFullMatch ? "text-secondary-dim" : "text-primary-dim";
  const accentBgClass = isFullMatch
    ? "active:bg-secondary-lighter/30"
    : "active:bg-primary-container/30";

  const scaledSteps = useMemo(() => {
    return detail.steps.map((s) => ({
      ...s,
      title: scaleMeasurementQuantitiesInText(s.title, scaleFactor),
      body: scaleMeasurementQuantitiesInText(s.body, scaleFactor),
    }));
  }, [detail.steps, scaleFactor]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-8 pt-4">
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[48px] max-w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-on-surface-variant transition-colors active:scale-[0.98] active:bg-surface-container-low active:text-on-surface"
            aria-label={backLabel}
          >
            <MaterialIcon
              name="arrow_back"
              className="shrink-0 text-2xl text-on-surface-variant"
            />
            <span className="font-label text-sm font-semibold uppercase tracking-wide">
              {backLabel}
            </span>
          </button>
          {canGoNext && onNextRecipe ? (
            <button
              type="button"
              onClick={onNextRecipe}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl px-3 py-2.5 text-on-surface-variant transition-colors active:scale-[0.98] active:bg-surface-container-low active:text-on-surface"
              aria-label="Nächstes neues Rezept"
            >
              <span className="font-label text-sm font-semibold uppercase tracking-wide">
                Nächstes
              </span>
              <MaterialIcon name="arrow_forward" className="text-xl" />
            </button>
          ) : null}
        </div>
        <div className="mb-6 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className={SCREEN_HEADING_CLASS}>{detail.title}</h2>
            {detailTag ? (
              <p
                className={`mt-1 font-label text-[11px] font-semibold uppercase tracking-[0.12em] ${accentTextClass}`}
              >
                {detailTag}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={`shrink-0 rounded-xl p-2 transition-colors ${accentTextClass} ${accentBgClass}`}
            onClick={toggleBookmark}
            aria-label={bookmarkAriaLabel}
            aria-pressed={bookmarked}
          >
            <MaterialIcon
              name="bookmark"
              filled={bookmarked}
              className="text-3xl"
            />
          </button>
        </div>
        {bookmarkFeedback ? (
          <p
            className="mb-4 text-sm font-medium text-primary"
            role="status"
            aria-live="polite"
          >
            {bookmarkFeedback}
          </p>
        ) : null}
        <div className="space-y-2.5 border-y border-outline-variant/15 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/45 px-2.5 py-2">
              <p className="font-label text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/80">
                Vorbereitung
              </p>
              <p className="mt-0.5 font-body text-sm font-medium text-on-surface/90">
                {formatMinutes(detail.prepMinutes)}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/45 px-2.5 py-2">
              <p className="font-label text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/80">
                Kochzeit
              </p>
              <p className="mt-0.5 font-body text-sm font-medium text-on-surface/90">
                {formatMinutes(detail.cookMinutes)}
              </p>
            </div>
          </div>
          {detail.equipmentNote || detail.nutritionNote ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {detail.equipmentNote ? (
                <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/45 px-2.5 py-2">
                  <p className="font-label text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/80">
                    Setup
                  </p>
                  <p className="mt-0.5 font-body text-sm leading-snug text-on-surface/85">
                    {detail.equipmentNote}
                  </p>
                </div>
              ) : null}
              {detail.nutritionNote ? (
                <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/45 px-2.5 py-2">
                  <p className="font-label text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant/80">
                    Balance
                  </p>
                  <p className="mt-0.5 font-body text-sm leading-snug text-on-surface/85">
                    {detail.nutritionNote}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <RecipeScalingSection
        detail={detail}
        resolvedMode={resolvedMode}
        basePortions={basePortions}
        displayPortions={displayPortions}
        displayPercent={displayPercent}
        onScalingModeChange={(id) => setScalingId(id)}
        onPortionsInput={setPortionsFromInput}
        onPercentInput={setPercentFromInput}
      />

      <section className="mb-12">
        {shoppingDisplayIngredients.length > 0 ? (
          <h3 className="mb-6 flex items-center gap-2 font-headline text-xl font-bold text-primary-dim">
            <MaterialIcon name="shopping_cart" className="text-primary-dim" />
            Einkaufen
          </h3>
        ) : null}
        {shoppingDisplayIngredients.length > 0 ? (
          <div
            className={`mb-4 overflow-hidden ${ingredientShoppingWarmPanelClass}`}
          >
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className={ingredientShoppingTableHeaderRowClass}>
                  <th className="px-6 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface">
                    <span>Zutat</span>{" "}
                    <span className="font-body text-xs font-normal normal-case tracking-normal text-on-surface-variant/80">
                      {"→"} Alternative
                    </span>
                  </th>
                  <th className="px-6 py-4 text-right font-label text-[10px] font-bold uppercase tracking-widest text-on-surface">
                    {resolvedMode === "percent" ? "Anteil" : "Menge"}
                  </th>
                </tr>
              </thead>
              <tbody
                className={`${ingredientShoppingTableBodyDivideClass} bg-surface-container-lowest/90`}
              >
                {shoppingDisplayIngredients.map((row, i) => (
                  <tr
                    key={`${row.component}-shopping-${i}`}
                    className="even:bg-primary/5"
                  >
                    <td className="px-6 py-4 text-sm text-on-surface">
                      {(() => {
                        const key = normalizeIngredientLabel(row.component);
                        const alt = alternativesByIngredient.get(key);
                        if (!alt) {
                          return (
                            <p className="font-headline text-sm font-bold text-on-surface">
                              {row.component}
                            </p>
                          );
                        }
                        return (
                          <p className="font-headline text-sm font-bold text-on-surface">
                            {row.component}{" "}
                            <span className="font-body text-xs font-normal text-on-surface-variant/80">
                              {"→"} {alt}
                            </span>
                          </p>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-sm font-bold text-on-surface">
                      {row.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {selectedDisplayIngredients.length > 0 ? (
          <h3 className="mb-6 flex items-center justify-between gap-2 font-headline text-xl font-bold text-on-surface">
            <span className="inline-flex items-center gap-2">
              <MaterialIcon name="kitchen" className="text-secondary-dim" />
              Zutaten
            </span>
            <InfoHintButton
              label="Hinweis zu dynamischen Verknüpfungen"
              text={dynamicLinksHint}
            />
          </h3>
        ) : null}

        {selectedDisplayIngredients.length > 0 ? (
          <div className={`overflow-hidden ${ingredientWarmPanelClass}`}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className={ingredientTableHeaderRowClass}>
                  <th className="px-6 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface">
                    Zutat
                  </th>
                  <th className="px-6 py-4 text-right font-label text-[10px] font-bold uppercase tracking-widest text-on-surface">
                    {resolvedMode === "percent" ? "Anteil" : "Menge"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/10 bg-surface-container-lowest/90">
                {selectedDisplayIngredients.map((row, i) => (
                  <tr key={`${row.component}-selected-${i}`} className="even:bg-secondary/5">
                    <td className="px-6 py-4 text-sm text-on-surface">
                      <p className="font-headline text-sm font-bold text-on-surface">
                        {row.component}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right font-headline text-sm font-bold text-on-surface">
                      {row.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {resolvedMode === "percent" ? (
          <p className="mt-3 font-body text-xs leading-relaxed text-on-surface-variant">
            Anteile schätzen die Mengenverhältnisse aus den Zahlenangaben im Rezept
            (einheitliche Skala nur zum Vergleich; gemischte Einheiten sind näherungsweise).
          </p>
        ) : null}
      </section>

      <section className="mb-12">
        <h3 className="mb-8 flex items-center gap-2 font-headline text-xl font-bold text-on-surface">
          <MaterialIcon name="restaurant_menu" />
          Zubereitung
        </h3>
        <div className="space-y-10">
          {scaledSteps.map((s, stepIndex) => {
            const num = String(s.order).padStart(2, "0");
            const usePrimaryAccent = Boolean(s.accent) && stepIndex > 0;
            return (
              <div key={s.order} className="flex gap-6">
                <div
                  className={
                    usePrimaryAccent
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline text-sm font-black text-on-primary-container"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high font-headline text-sm font-black text-on-surface-variant"
                  }
                >
                  {num}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <h4
                    className={
                      usePrimaryAccent
                        ? "mb-2 font-headline text-sm font-bold uppercase tracking-wide text-primary"
                        : "mb-2 font-headline text-sm font-bold uppercase tracking-wide text-on-surface"
                    }
                  >
                    {s.title}
                  </h4>
                  <p className="font-body leading-relaxed text-on-surface-variant">
                    {s.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {detail.cleanupNote ? (
        <section
          className="mb-12 rounded-xl border border-outline-variant/15 bg-surface-container-low/60 p-5"
          aria-label="Zusatz-Hinweis"
        >
          <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Zusatz-Hinweis
          </p>
          <p className="font-body text-sm leading-relaxed text-on-surface">
            {detail.cleanupNote}
          </p>
        </section>
      ) : null}

      <footer className="mt-16 border-t border-outline-variant/20 pt-8">
        <div className="mb-8" />
        {bookmarkAddedAt ? (
          <div className="flex justify-end">
            <span className="font-label text-[10px] uppercase tracking-widest opacity-40">
              Gespeichert am: {formatBookmarkDate(bookmarkAddedAt)}
            </span>
          </div>
        ) : null}
      </footer>
    </main>
  );
}
