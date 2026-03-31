export function RecipeMatchCardSkeleton() {
  return (
    <div className="relative h-[85px] overflow-hidden rounded-2xl border border-outline-variant/40 bg-[linear-gradient(92deg,rgba(163,163,163,0.2)_0%,rgba(173,173,173,0.32)_28%,rgba(190,190,190,0.44)_50%,rgba(176,176,176,0.32)_72%,rgba(165,165,165,0.2)_100%)] p-4">
      <div className="skeleton-wave-overlay pointer-events-none absolute inset-0" />
      <div className="relative min-w-0">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-black/8" />
          <div className="h-3 w-2/3 rounded bg-black/8" />
        </div>
      </div>
    </div>
  );
}
