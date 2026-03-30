import type { RecipeDetail } from "../../types";

/** Transparent; no fill — only opacity / press affordance. */
const STEPPER_BTN_CLASS =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent font-headline text-lg font-semibold leading-none text-on-surface transition-[opacity,transform] hover:opacity-80 active:scale-[0.96] disabled:opacity-35 disabled:hover:opacity-35";

type RecipeScalingSectionProps = {
  detail: RecipeDetail;
  resolvedMode: "percent" | "portions";
  displayPortions: number;
  displayPercent: number;
  isScaleAtFloor: boolean;
  isScaleAtCeiling: boolean;
  onScalingModeChange: (modeId: string) => void;
  onPortionsInput: (n: number) => void;
  onPercentInput: (n: number) => void;
};

function displayScalingModeLabel(modeId: string, rawLabel: string): string {
  // UI-only canonical labels for the scaling mode ids.
  // Storage must not rewrite persisted state for presentation.
  if (modeId === "percent") return "%";
  if (modeId === "portions") return "Portionen";
  return rawLabel;
}

export function RecipeScalingSection({
  detail,
  resolvedMode,
  displayPortions,
  displayPercent,
  isScaleAtFloor,
  isScaleAtCeiling,
  onScalingModeChange,
  onPortionsInput,
  onPercentInput,
}: RecipeScalingSectionProps) {
  return (
    <section className="mb-10 flex flex-col gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-high/50 p-5">
      <h3 className="font-headline text-lg font-bold text-on-surface">Menge anpassen</h3>
      <div className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-2.5">
        {resolvedMode === "portions" ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className={STEPPER_BTN_CLASS}
              disabled={isScaleAtFloor}
              onClick={() => onPortionsInput(displayPortions - 1)}
              aria-label="Eine Portion weniger"
            >
              −
            </button>
            <input
              className="min-w-0 flex-1 rounded-lg border border-outline-variant/45 bg-surface-container-lowest px-2 py-2 text-center font-headline text-lg font-bold tabular-nums text-on-surface [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-outline-variant/35 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
              className={STEPPER_BTN_CLASS}
              disabled={isScaleAtCeiling}
              onClick={() => onPortionsInput(displayPortions + 1)}
              aria-label="Eine Portion mehr"
            >
              +
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className={STEPPER_BTN_CLASS}
              disabled={isScaleAtFloor}
              onClick={() => onPercentInput(displayPercent - 5)}
              aria-label="Fünf Prozent weniger"
            >
              −
            </button>
            <div className="relative min-w-0 flex-1 rounded-lg border border-outline-variant/45 bg-surface-container-lowest py-2 focus-within:ring-2 focus-within:ring-outline-variant/35">
              <input
                className="w-full min-w-0 bg-transparent py-0 pl-2 pr-6 text-center font-headline text-lg font-bold tabular-nums text-on-surface [appearance:textfield] focus:outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                inputMode="decimal"
                min={1}
                value={displayPercent}
                onChange={(e) => {
                  const raw = e.target.value.replace(",", ".");
                  const v = parseFloat(raw);
                  if (Number.isNaN(v)) return;
                  onPercentInput(v);
                }}
                aria-label="Prozent der Rezeptbasis"
              />
              <span
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-headline text-lg font-bold tabular-nums text-on-surface-variant"
                aria-hidden
              >
                %
              </span>
            </div>
            <button
              type="button"
              className={STEPPER_BTN_CLASS}
              disabled={isScaleAtCeiling}
              onClick={() => onPercentInput(displayPercent + 5)}
              aria-label="Fünf Prozent mehr"
            >
              +
            </button>
          </div>
        )}
        <div className="flex shrink-0 rounded-lg border border-outline-variant/45 bg-surface-container-lowest p-1.5">
          {detail.scalingModes.map((mode) => {
            const isOn = mode.id === resolvedMode;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onScalingModeChange(mode.id)}
                className={
                  isOn
                    ? "min-w-0 shrink rounded-md border border-outline-variant/40 bg-surface px-2.5 py-2 font-headline text-sm font-bold tabular-nums text-on-surface"
                    : "min-w-0 shrink rounded-md border border-transparent px-2.5 py-2 font-headline text-sm font-medium tabular-nums text-on-surface-variant transition-colors active:border-outline-variant/25 active:bg-surface-container-low px-2.5"
                }
              >
                {displayScalingModeLabel(mode.id, mode.label)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
