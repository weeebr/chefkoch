/** Primary page title — use for tab screens and full-screen views (e.g. recipe detail). */
export const SCREEN_HEADING_CLASS =
  "font-headline text-4xl font-extrabold leading-none tracking-tight text-on-surface";

/** Icon + headline row only (no vertical margin). */
export const SCREEN_TITLE_ICON_ROW_CLASS = "flex min-w-0 items-center gap-3";

/** Space below the top title block on tab screens. */
export const SCREEN_TITLE_BLOCK_MARGIN_CLASS = "mb-12";

/** Single-line title rows (Zutaten, Rezepte): row + bottom margin. */
export const SCREEN_TITLE_ROW_CLASS = `${SCREEN_TITLE_ICON_ROW_CLASS} ${SCREEN_TITLE_BLOCK_MARGIN_CLASS}`;

/** Fixed box so Material icons of different glyphs don’t nudge the headline horizontally. */
export const SCREEN_TITLE_ICON_WRAP_CLASS =
  "flex h-[1em] w-[1em] shrink-0 items-center justify-center text-4xl leading-none";

/** Tab screen title icon — neutral (no chromatic accent). */
export const SCREEN_TITLE_ICON_CLASS = "text-[0.72em] leading-none text-on-surface";

/** Shared main column for tab screens — keeps padding and flex behavior consistent vs bottom nav. */
export const TAB_SCREEN_MAIN_CLASS =
  "mx-auto w-full min-w-0 max-w-2xl flex-1 px-6 py-8";

/** Zutaten tab: slightly narrower column than Rezepte / default list screens. */
export const INGREDIENTS_SCREEN_MAIN_CLASS =
  "mx-auto w-full min-w-0 max-w-xl flex-1 px-6 py-8";
