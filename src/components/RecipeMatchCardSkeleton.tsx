import { MaterialIcon } from "./MaterialIcon";

export function RecipeMatchCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-low/70 p-4">
      <div className="skeleton-wave-overlay pointer-events-none absolute inset-0" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-on-surface/12" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-on-surface/12" />
        </div>
        <MaterialIcon
          name="progress_activity"
          className="shrink-0 animate-spin text-on-surface-variant/80"
        />
      </div>
    </div>
  );
}
