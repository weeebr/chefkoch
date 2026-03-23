import { useState } from "react";
import { MaterialIcon } from "../../components/MaterialIcon";
import { useAppData } from "../../data/AppDataContext";

export function GenerateRecipesPanel() {
  const { state, generateRecipesFromPantrySelection } = useAppData();
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [willingToShop, setWillingToShop] = useState(false);

  const hasGroqKey = Boolean(state.groqApiKey.trim());
  const hasSelection = state.selectedPantryIds.length > 0;
  const canGenerate = hasGroqKey && hasSelection && !genLoading;
  const hasGenerationPrereqs = hasGroqKey && hasSelection;

  async function handleGenerate() {
    setGenError(null);
    setGenLoading(true);
    const err = await generateRecipesFromPantrySelection({ willingToShop });
    setGenLoading(false);
    if (err) setGenError(err);
  }

  return (
    <section className="space-y-3 pt-2">
      <div className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-primary/14 bg-primary-container/8 p-4">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className={[
            "flex w-full items-center justify-center gap-3 rounded-full px-8 py-3.5 font-bold transition-all",
            !hasGenerationPrereqs
              ? "cursor-not-allowed bg-on-surface/12 text-on-surface/38"
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
          <span>
            {genLoading ? "Wird generiert…" : "Neue Rezepte generieren"}
          </span>
        </button>

        <label className="mx-auto flex w-fit cursor-pointer items-start gap-3 text-left">
          <input
            type="checkbox"
            checked={willingToShop}
            onChange={(e) => setWillingToShop(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant accent-primary focus:ring-primary/20"
          />
          <span className="text-sm leading-snug text-on-surface">
            <span className="font-semibold"> mit Zusatz-Zutaten</span>
            <span> (Einkauf)</span>
          </span>
        </label>
      </div>
      {!hasGroqKey && (
        <p className="text-center text-xs text-on-surface-variant">
          API-Schlüssel unter Settings eintragen.
        </p>
      )}
      {hasGroqKey && !hasSelection && (
        <p className="text-center text-xs text-on-surface-variant">
          Mindestens 1 Zutat auswählen.
        </p>
      )}
      {genError && (
        <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-2 text-center text-sm text-error">
          {genError}
        </p>
      )}
    </section>
  );
}
