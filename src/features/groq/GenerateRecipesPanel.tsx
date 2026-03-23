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

  async function handleGenerate() {
    setGenError(null);
    setGenLoading(true);
    const err = await generateRecipesFromPantrySelection({ willingToShop });
    setGenLoading(false);
    if (err) setGenError(err);
  }

  return (
    <section className="space-y-3 pt-2">
      <label className="mx-auto flex max-w-sm cursor-pointer items-start gap-3 rounded-2xl border border-primary/14 bg-primary-container/8 px-4 py-3 text-left">
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
      <div className="flex justify-center">
        <button
          type="button"
          disabled={!canGenerate}
          onClick={() => void handleGenerate()}
          className={
            canGenerate
              ? "flex items-center gap-3 rounded-full border border-primary/22 bg-primary-container/90 px-8 py-3.5 font-bold text-on-primary-container transition-all active:scale-95 active:bg-primary-container"
              : "flex cursor-not-allowed items-center gap-3 rounded-full bg-on-surface/12 px-8 py-3.5 font-bold text-on-surface/38"
          }
        >
          <MaterialIcon
            name="auto_awesome"
            filled
            className="text-on-primary-container"
          />
          <span>
            {genLoading ? "Wird generiert…" : "Neue Rezepte generieren"}
          </span>
        </button>
      </div>
      {!hasGroqKey && (
        <p className="text-center text-xs text-on-surface-variant">
          API-Schlüssel unter Settings eintragen.
        </p>
      )}
      {hasGroqKey && !hasSelection && (
        <p className="text-center text-xs text-on-surface-variant">
          Mindestens eine Zutat auswählen.
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
