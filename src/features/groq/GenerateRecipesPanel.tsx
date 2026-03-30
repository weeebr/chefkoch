import { useEffect, useState } from "react";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useAppData } from "../../data/AppDataContext";
import { estimateWaitSecondsForNextClick } from "./groqTpmMinuteStore";

export function GenerateRecipesPanel() {
  const { state, generateRecipesFromPantrySelection } = useAppData();
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [willingToShop, setWillingToShop] = useState(false);
  const [strictUseAllSelected, setStrictUseAllSelected] = useState(false);
  const hasGroqApiKey = state.groqApiKey.trim().length > 0;

  const hasMinSelection = state.selectedPantryIds.length >= 2;
  /** Bumps once per second while waiting so we re-read `Date.now()` (avoids stale clock after generate ends). */
  const [, setCountdownTick] = useState(0);
  const waitSeconds = estimateWaitSecondsForNextClick(Date.now());
  const checkboxDisabled = !hasMinSelection;
  const hasTpmBudget = waitSeconds === 0;
  const canGenerate =
    hasGroqApiKey && hasMinSelection && hasTpmBudget && !genLoading;
  const hasGenerationPrereqs = canGenerate;

  const shouldTickCountdown = hasMinSelection && !genLoading && waitSeconds > 0;

  useEffect(() => {
    if (!shouldTickCountdown) return;
    const id = window.setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [shouldTickCountdown]);

  const countdownLabel = (() => {
    const mm = Math.floor(waitSeconds / 60);
    const ss = waitSeconds % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  })();

  async function handleGenerate() {
    setGenError(null);
    setGenLoading(true);
    const err = await generateRecipesFromPantrySelection({
      willingToShop,
      strictUseAllSelected,
    });
    setGenLoading(false);
    if (err) setGenError(err);
  }

  return (
    <section className="space-y-3 pt-2">
      <div className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-primary/14 bg-primary-container/8 p-4">
        {!hasMinSelection && (
          <p className="text-center text-sm text-error">
            Mindestens 2 Zutaten auswählen.
          </p>
        )}
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className={[
            "flex w-full items-center justify-center gap-3 rounded-full px-8 py-3.5 font-bold transition-all",
            !hasGenerationPrereqs
              ? "cursor-not-allowed border border-outline-variant/40 bg-on-surface/10 text-on-surface/40"
              : willingToShop
                ? "border border-primary/22 bg-primary-container/90 text-on-primary-container"
                : "border border-secondary/25 bg-secondary-container/80 text-on-secondary-container",
            canGenerate ? "active:scale-95" : "",
            genLoading
              ? willingToShop
                ? "bg-primary-container text-on-primary-container/90"
                : "bg-secondary-container text-on-secondary-container/90"
              : "",
          ].join(" ")}
        >
          <MaterialIcon
            name="auto_awesome"
            filled
            className={
              !hasGenerationPrereqs
                ? "text-on-surface/38"
                : willingToShop
                  ? "text-on-primary-container"
                  : "text-on-secondary-container"
            }
          />
          <span className="whitespace-nowrap">
            {genLoading
              ? "Wird generiert…"
              : !hasTpmBudget
                ? `Neue Rezepte generieren (${countdownLabel})`
                : "Neue Rezepte generieren"}
          </span>
        </button>
        {!hasGroqApiKey && (
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Um Rezepte zu generieren, hinterlege einen Groq-API-Key. Den Key
            bekommst du hier:{" "}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              https://console.groq.com/keys
            </a>
            . Füge ihn anschliessend{" "}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("chefkoch:navigate", {
                    detail: { screen: "settings", focusId: "groq-api-key" },
                  }),
                );
              }}
              className="underline underline-offset-2"
            >
              hier
            </button>{" "}
            hinzu.
          </p>
        )}

        <label
          className={[
            "mx-auto flex w-fit items-start gap-3 text-left",
            checkboxDisabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={willingToShop}
            disabled={checkboxDisabled}
            onChange={(e) => setWillingToShop(e.target.checked)}
            className={[
              "mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant focus:ring-primary/20 accent-primary",
              checkboxDisabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          />
          <span
            className={[
              "text-sm leading-snug",
              checkboxDisabled ? "text-on-surface/50" : "text-on-surface",
            ].join(" ")}
          >
            <span className="font-semibold"> mit Zusatz-Zutaten</span>
            <span> (Einkauf)</span>
          </span>
        </label>

        <label
          className={[
            "mx-auto flex w-fit items-start gap-3 text-left",
            checkboxDisabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer",
          ].join(" ")}
        >
          <input
            type="checkbox"
            checked={strictUseAllSelected}
            disabled={checkboxDisabled}
            onChange={(e) => setStrictUseAllSelected(e.target.checked)}
            className={[
              "mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant focus:ring-primary/20 accent-primary",
              checkboxDisabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          />
          <span
            className={[
              "text-sm leading-snug",
              checkboxDisabled ? "text-on-surface/50" : "text-on-surface",
            ].join(" ")}
          >
            <span className="font-semibold">
              alle ausgewählte Zutaten verwenden
            </span>
          </span>
        </label>
      </div>
      {genError && (
        <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-2 text-center text-sm text-error">
          {genError}
        </p>
      )}
    </section>
  );
}
