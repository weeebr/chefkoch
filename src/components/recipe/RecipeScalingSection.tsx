import type { RecipeDetail } from "../../types";

type RecipeScalingSectionProps = {
  detail: RecipeDetail;
  resolvedMode: "percent" | "portions";
  basePortions: number;
  displayPortions: number;
  displayPercent: number;
  onScalingModeChange: (modeId: string) => void;
  onPortionsInput: (n: number) => void;
  onPercentInput: (n: number) => void;
};

export function RecipeScalingSection({
  detail,
  resolvedMode,
  basePortions,
  displayPortions,
  displayPercent,
  onScalingModeChange,
  onPortionsInput,
  onPercentInput,
}: RecipeScalingSectionProps) {
  return (
    <section className="mb-10 flex flex-col gap-6 rounded-xl border border-outline-variant/40 bg-surface-container-high/50 p-5 sm:p-6">
      <div className="flex flex-col">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          Mengen anpassen
        </h3>
      </div>
      {resolvedMode === "portions" ? (
        <div className="flex flex-col gap-3">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Gewünschte Portionen
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container font-headline text-lg font-bold text-on-surface-variant transition-colors active:bg-surface-container-high disabled:opacity-40"
              disabled={displayPortions <= 1}
              onClick={() => onPortionsInput(displayPortions - 1)}
              aria-label="Eine Portion weniger"
            >
              −
            </button>
            <input
              className="min-w-[4.5rem] flex-1 rounded-lg border border-outline-variant/45 bg-surface-container-lowest px-3 py-2.5 text-center font-headline text-lg font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-outline-variant/35"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={displayPortions}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v)) return;
                onPortionsInput(v);
              }}
              aria-label="Portionen"
            />
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container font-headline text-lg font-bold text-on-surface-variant transition-colors active:bg-surface-container-high disabled:opacity-40"
              disabled={displayPortions >= 99}
              onClick={() => onPortionsInput(displayPortions + 1)}
              aria-label="Eine Portion mehr"
            >
              +
            </button>
          </div>
          <p className="font-body text-xs text-on-surface-variant">
            Entspricht ca.{" "}
            <span className="font-medium text-on-surface">
              {displayPercent}%
            </span>{" "}
            der Rezeptbasis.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Skalierung in Prozent
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container font-headline text-lg font-bold text-on-surface-variant transition-colors active:bg-surface-container-high disabled:opacity-40"
              disabled={displayPercent <= 10}
              onClick={() => onPercentInput(displayPercent - 5)}
              aria-label="Fünf Prozent weniger"
            >
              −
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-outline-variant/45 bg-surface-container-lowest px-3 py-2.5 focus-within:ring-2 focus-within:ring-outline-variant/35">
              <input
                className="min-w-0 flex-1 bg-transparent text-center font-headline text-lg font-bold text-on-surface focus:outline-none focus:ring-0"
                type="number"
                inputMode="decimal"
                min={10}
                max={500}
                step={5}
                value={displayPercent}
                onChange={(e) => {
                  const raw = e.target.value.replace(",", ".");
                  const v = parseFloat(raw);
                  if (Number.isNaN(v)) return;
                  onPercentInput(v);
                }}
                aria-label="Prozent der Rezeptbasis"
              />
              <span className="shrink-0 font-headline text-lg font-bold text-on-surface-variant">
                %
              </span>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container font-headline text-lg font-bold text-on-surface-variant transition-colors active:bg-surface-container-high disabled:opacity-40"
              disabled={displayPercent >= 500}
              onClick={() => onPercentInput(displayPercent + 5)}
              aria-label="Fünf Prozent mehr"
            >
              +
            </button>
          </div>
          <p className="font-body text-xs text-on-surface-variant">
            Entspricht ca.{" "}
            <span className="font-medium text-on-surface">
              {displayPortions}
            </span>{" "}
            Portionen (Basis {basePortions}).
          </p>
        </div>
      )}
      <div className="flex rounded-lg border border-outline-variant/45 bg-surface-container-lowest p-1.5">
        {detail.scalingModes.map((mode) => {
          const isOn = mode.id === resolvedMode;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onScalingModeChange(mode.id)}
              className={
                isOn
                  ? "flex-1 rounded-md border border-outline-variant/40 bg-surface px-4 py-2 font-label text-xs font-bold uppercase text-on-surface"
                  : "flex-1 rounded-md border border-transparent px-4 py-2 font-label text-xs font-medium uppercase text-on-surface-variant transition-colors active:border-outline-variant/25 active:bg-surface-container-low"
              }
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
