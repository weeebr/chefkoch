/** Shared warm brown / pantry tone for ingredient UI across Zutaten, Rezepte, and detail. */
export const ingredientSectionHeadingClass =
  "text-sm font-bold uppercase tracking-widest text-secondary-dim";

export const ingredientWarmPanelClass =
  "rounded-xl border border-secondary/18 bg-tertiary-lighter/75";

export const ingredientTableHeaderRowClass = "bg-secondary-lighter/30";

/** Greenish panel/palette for "shopping add-ons" ingredients in recipe detail. */
export const ingredientShoppingWarmPanelClass =
  "rounded-xl border border-primary/18 bg-primary-container/25";

export const ingredientShoppingTableHeaderRowClass =
  "bg-primary-container/30";

export const ingredientShoppingTableBodyDivideClass = "divide-primary/10";

/** Border, background, and pressed state for selected pantry chips — reuse for matching CTAs. */
export const ingredientSelectedChipSurfaceClass =
  "border-secondary/20 bg-secondary-lighter/45 active:bg-secondary-lighter/65";

const chipBase =
  "group inline-flex min-h-[34px] max-w-full select-none items-center justify-center gap-1.5 self-start justify-self-start rounded-xl border px-3 py-1 transition-colors [-webkit-tap-highlight-color:transparent] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/22";

export function chipButtonClassName(selected: boolean): string {
  return selected
    ? `${chipBase} ${ingredientSelectedChipSurfaceClass}`
    : `${chipBase} border-secondary/12 bg-tertiary-lighter active:bg-secondary-lighter/25`;
}

export function chipIconClassName(selected: boolean): string {
  return selected
    ? "pointer-events-none shrink-0 text-sm text-on-secondary-fixed/90"
    : "pointer-events-none shrink-0 text-sm text-secondary-dim/90";
}

export function chipLabelClassName(selected: boolean): string {
  return selected
    ? "pointer-events-none max-w-[7.5rem] truncate text-sm font-medium text-on-secondary-fixed/95"
    : "pointer-events-none max-w-[7.5rem] truncate text-sm font-medium text-on-surface";
}
