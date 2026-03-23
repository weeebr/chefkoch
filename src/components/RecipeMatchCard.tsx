import type { KeyboardEvent, ReactNode } from "react";
import { BOOKMARK_ARIA_ADD } from "../hooks/bookmarkStrings";
import { MaterialIcon } from "./MaterialIcon";

export type RecipeMatchCardProps = {
  title: string;
  minutes: number;
  onOpen: () => void;
  /** Shown after the time in the meta row (e.g. tag, or status). */
  endMeta: ReactNode;
  /**
   * Optional control in the right strip (with divider). Not used when the
   * add-bookmark button is shown — that sits before the chevron in the main row.
   */
  trailingAction?: ReactNode;
  /** Lesezeichen-Zustand (steuert Kartenrahmen; Lesezeichen-Button nur wenn nicht gesetzt). */
  bookmarked?: boolean;
  /** True when current selection fully matches this recipe. */
  isFullMatch?: boolean;
  /** Nur sichtbar solange `bookmarked` false — Speichern aus der Karte. */
  onBookmarkToggle?: () => void;
};

export function RecipeMatchCard({
  title,
  minutes,
  onOpen,
  endMeta,
  trailingAction,
  bookmarked = false,
  isFullMatch = false,
  onBookmarkToggle,
}: RecipeMatchCardProps) {
  const accentTextClass = isFullMatch ? "text-primary-dim" : "text-secondary-dim";
  const accentBgClass = isFullMatch
    ? "active:bg-primary-container/30"
    : "active:bg-secondary-fixed-dim/30";
  const chevronClass = isFullMatch
    ? "shrink-0 text-primary-dim/70"
    : "shrink-0 text-secondary-dim/70";

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const showAddBookmark = Boolean(onBookmarkToggle) && !bookmarked;
  const addBookmarkButton = showAddBookmark ? (
    <button
      type="button"
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[color,transform] active:scale-95",
        accentTextClass,
        accentBgClass,
      ].join(" ")}
      aria-label={BOOKMARK_ARIA_ADD}
      aria-pressed={false}
      onClick={(e) => {
        e.stopPropagation();
        onBookmarkToggle?.();
      }}
    >
      <MaterialIcon name="bookmark" filled={false} className="text-2xl" />
    </button>
  ) : null;
  const stripContent = showAddBookmark ? null : (trailingAction ?? null);

  return (
    <div
      className={[
        "flex items-stretch justify-between rounded-2xl border transition-colors",
        bookmarked && isFullMatch
          ? "border-primary/45 bg-primary-container/40"
          : bookmarked
            ? "border-secondary/45 bg-secondary-fixed-dim/30"
            : isFullMatch
              ? "border-primary/30 bg-primary-container/15"
              : "border-secondary/35 bg-secondary-fixed-dim/5",
      ].join(" ")}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={onKeyDown}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 p-4 text-left outline-none ring-inset focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="font-bold text-on-surface">{title}</h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-on-surface-variant">
            <span className="flex shrink-0 items-center gap-1">
              <MaterialIcon name="schedule" className="text-[14px]" />
              {minutes > 0 ? `${minutes}m` : "—"}
            </span>
            {endMeta}
          </div>
        </div>
        {addBookmarkButton}
        <MaterialIcon
          name="chevron_right"
          className={chevronClass}
        />
      </div>
      {stripContent ? (
        <div className="flex shrink-0 items-center border-l border-outline-variant/10 pr-3 pl-1">
          {stripContent}
        </div>
      ) : null}
    </div>
  );
}
