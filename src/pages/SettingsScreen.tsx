import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryIconSelect } from "../components/CategoryIconSelect";
import {
  ingredientSectionHeadingClass,
  ingredientSelectedChipSurfaceClass,
  ingredientWarmPanelClass,
} from "../components/ingredients/ingredientChipStyles";
import {
  SCREEN_HEADING_CLASS,
  SCREEN_TITLE_BLOCK_MARGIN_CLASS,
  SCREEN_TITLE_ICON_ROW_CLASS,
  TAB_SCREEN_MAIN_CLASS,
} from "../components/layout/screenHeading";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAppData } from "../data/AppDataContext";
import { materialIconForCategory } from "../data/iconFromCategory";
import { type IconCategory, type PantryIngredient } from "../types";

const categorySelectButtonForm =
  "border border-secondary/14 bg-surface-container-lowest";

const ingredientFieldLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.15em] text-on-secondary-fixed-variant";

const ingredientRadioClass =
  "h-4 w-4 border-secondary/20 accent-secondary focus:ring-secondary/20";

const ingredientSubmitButtonClass = `flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 font-bold text-on-secondary-fixed transition-all active:scale-95 ${ingredientSelectedChipSurfaceClass}`;

function ManageRow({
  row,
  isEditing,
  onRequestEdit,
  onFinishEdit,
  onUpdate,
  onRemove,
}: {
  row: PantryIngredient;
  isEditing: boolean;
  onRequestEdit: () => void;
  onFinishEdit: () => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<PantryIngredient, "name" | "category" | "status">>,
  ) => void;
  onRemove: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(row.name);
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setNameDraft(row.name);
    }
  }, [row.name, row.id, isEditing]);

  useEffect(() => {
    if (wasEditingRef.current && !isEditing) {
      const t = nameDraft.trim();
      if (!t) setNameDraft(row.name);
      else if (t !== row.name) onUpdate(row.id, { name: t });
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, nameDraft, row.id, row.name, onUpdate]);

  function commitNameAndClose() {
    const t = nameDraft.trim();
    if (!t) {
      setNameDraft(row.name);
    } else if (t !== row.name) {
      onUpdate(row.id, { name: t });
    }
    onFinishEdit();
  }

  if (!isEditing) {
    return (
      <div className={savedIngredientViewRowClass}>
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-[4.75rem]">
          <MaterialIcon
            name={materialIconForCategory(row.category)}
            className="shrink-0 text-lg text-secondary-dim"
          />
          <p className="min-w-0 flex-1 truncate font-medium leading-normal text-on-surface">
            {row.name}
          </p>
        </div>
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5">
          <button
            type="button"
            onClick={onRequestEdit}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors active:bg-surface-container-low"
            aria-label={`${row.name} bearbeiten`}
          >
            <MaterialIcon name="edit" className="text-[22px]" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors active:bg-surface-container-low"
            aria-label={`${row.name} löschen`}
          >
            <MaterialIcon name="delete" className="text-[22px]" />
          </button>
        </div>
      </div>
    );
  }

  const nameFieldId = `pantry-edit-name-${row.id}`;
  const categoryFieldId = `pantry-edit-category-${row.id}`;
  const statusGroupName = `pantry-status-${row.id}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={nameFieldId} className={ingredientFieldLabelClass}>
          Name der Zutat
        </label>
        <input
          id={nameFieldId}
          className={ingredientFieldClass}
          placeholder="z. B. frisches Basilikum"
          type="text"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitNameAndClose();
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={categoryFieldId} className={ingredientFieldLabelClass}>
          Kategorie (Icon)
        </label>
        <CategoryIconSelect
          buttonId={categoryFieldId}
          value={row.category}
          onChange={(c) => onUpdate(row.id, { category: c })}
          buttonClassName={categorySelectButtonForm}
          listZClass="z-[70]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className={ingredientFieldLabelClass}>Status</span>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              checked={row.status === "raw"}
              onChange={() => onUpdate(row.id, { status: "raw" })}
              className={ingredientRadioClass}
              name={statusGroupName}
              type="radio"
              value="raw"
            />
            <span className="text-sm font-medium text-on-surface">
              Prep nötig
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              checked={row.status === "precooked"}
              onChange={() => onUpdate(row.id, { status: "precooked" })}
              className={ingredientRadioClass}
              name={statusGroupName}
              type="radio"
              value="precooked"
            />
            <span className="text-sm font-medium text-on-surface">
              Ready / Vorgekocht
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              checked={row.status === "spice"}
              onChange={() => onUpdate(row.id, { status: "spice" })}
              className={ingredientRadioClass}
              name={statusGroupName}
              type="radio"
              value="spice"
            />
            <span className="text-sm font-medium text-on-surface">Gewürze</span>
          </label>
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => commitNameAndClose()}
          className={`${ingredientSubmitButtonClass} min-w-0 flex-1`}
        >
          <MaterialIcon name="check" className="text-lg" />
          <span>Fertig</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border border-secondary/30 text-on-surface-variant transition-colors active:bg-surface-container-low"
          aria-label={`${row.name} löschen`}
        >
          <MaterialIcon name="delete" className="text-xl" />
        </button>
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20";

/** Shared surface with «Name der Zutat» (border, fill, radius, padding, type size). */
const ingredientControlSurfaceClass =
  "rounded-xl border border-secondary/20 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface";

const ingredientFieldClass = `${ingredientControlSurfaceClass} w-full placeholder:text-on-surface-variant/50 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25`;

/** Saved row (view): same surface as inputs; actions are absolutely positioned so row height matches the text field. */
const savedIngredientViewRowClass = `relative flex w-full min-w-0 items-center ${ingredientControlSurfaceClass} transition-colors`;

export function SettingsScreen() {
  const {
    state,
    addPantryItem,
    removePantryItem,
    updatePantryItem,
    setGroqApiKey,
    setShoppingLocationLabel,
    resetAppData,
  } = useAppData();
  const pantryNewestFirst = useMemo(
    () => [...state.pantry].sort((a, b) => b.addedAt - a.addedAt),
    [state.pantry],
  );
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IconCategory>("Kühlschrank");
  const [status, setStatus] = useState<PantryIngredient["status"]>("raw");
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null);
  const [groqApiKeyDraft, setGroqApiKeyDraft] = useState(state.groqApiKey);
  const hasOwnGroqApiKey = groqApiKeyDraft.trim().length > 0;

  useEffect(() => {
    setGroqApiKeyDraft(state.groqApiKey);
  }, [state.groqApiKey]);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addPantryItem({
      name: trimmed,
      category,
      status,
    });
    setName("");
  }

  return (
    <main className={TAB_SCREEN_MAIN_CLASS}>
      <section className="mb-12 space-y-6">
        <div className={`space-y-2 ${SCREEN_TITLE_BLOCK_MARGIN_CLASS}`}>
          <div className={SCREEN_TITLE_ICON_ROW_CLASS}>
            <h2 className={SCREEN_HEADING_CLASS}>Settings</h2>
          </div>
          <p className="text-sm text-on-surface-variant">
            Zutaten hinzufügen und deinen Vorrat verwalten.
          </p>
        </div>

        <div>
          <h3 className={`mb-4 ${ingredientSectionHeadingClass}`}>
            Neue Zutat
          </h3>
          <form
            className={`space-y-5 p-5 ${ingredientWarmPanelClass}`}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdd();
            }}
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor="ingredient-name"
                className={ingredientFieldLabelClass}
              >
                Name der Zutat
              </label>
              <input
                id="ingredient-name"
                className={ingredientFieldClass}
                placeholder="z. B. frisches Basilikum"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="icon-category"
                className={ingredientFieldLabelClass}
              >
                Kategorie (Icon)
              </label>
              <CategoryIconSelect
                buttonId="icon-category"
                value={category}
                onChange={setCategory}
                buttonClassName={categorySelectButtonForm}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className={ingredientFieldLabelClass}>Status</span>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    checked={status === "raw"}
                    onChange={() => setStatus("raw")}
                    className={ingredientRadioClass}
                    name="status"
                    type="radio"
                    value="raw"
                  />
                  <span className="text-sm font-medium text-on-surface">
                    Prep nötig
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    checked={status === "precooked"}
                    onChange={() => setStatus("precooked")}
                    className={ingredientRadioClass}
                    name="status"
                    type="radio"
                    value="precooked"
                  />
                  <span className="text-sm font-medium text-on-surface">
                    Ready / Vorgekocht
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    checked={status === "spice"}
                    onChange={() => setStatus("spice")}
                    className={ingredientRadioClass}
                    name="status"
                    type="radio"
                    value="spice"
                  />
                  <span className="text-sm font-medium text-on-surface">
                    Gewürze
                  </span>
                </label>
              </div>
            </div>
            <button type="submit" className={ingredientSubmitButtonClass}>
              <MaterialIcon name="add" className="text-lg" />
              <span>Zutat hinzufügen</span>
            </button>
          </form>
        </div>
      </section>

      <section>
        <h3 className={`mb-3 ${ingredientSectionHeadingClass}`}>
          Gespeicherte Zutaten
        </h3>
        <div className={`p-5 ${ingredientWarmPanelClass}`}>
          <div className="flex flex-col gap-2">
            {pantryNewestFirst.length === 0 ? (
              <p className="py-4 text-center text-sm text-on-surface-variant">
                Noch keine Zutaten — oben hinzufügen.
              </p>
            ) : (
              pantryNewestFirst.map((row) => (
                <ManageRow
                  key={row.id}
                  row={row}
                  isEditing={editingPantryId === row.id}
                  onRequestEdit={() => setEditingPantryId(row.id)}
                  onFinishEdit={() => setEditingPantryId(null)}
                  onUpdate={updatePantryItem}
                  onRemove={() => {
                    setEditingPantryId((id) => (id === row.id ? null : id));
                    removePantryItem(row.id);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-12 space-y-6">
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Lokale Daten
          </h3>
          <div className="space-y-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
            <p className="text-sm leading-relaxed text-on-surface-variant">
              Löscht alle in diesem Browser gespeicherten App-Daten: Vorrat,
              Auswahl, Rezepte, Lesezeichen und Standort. Der{" "}
              <span className="font-semibold text-on-surface">
                Groq-API-Schlüssel
              </span>{" "}
              bleibt erhalten.
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Alle lokalen App-Daten löschen? Dies kann nicht rückgängig gemacht werden.",
                  )
                ) {
                  return;
                }
                resetAppData();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-error/35 bg-error/10 px-6 py-3 text-sm font-bold text-error transition-colors active:bg-error/15 active:scale-[0.99]"
            >
              <MaterialIcon name="delete_forever" className="text-lg" />
              <span>Alle Daten löschen (Groq-Schlüssel behalten)</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Standort / Region
          </h3>
          <div className="space-y-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
            <label
              htmlFor="shopping-location"
              className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant"
            >
              Dein Ort
            </label>
            <input
              id="shopping-location"
              className={fieldClass}
              type="text"
              autoComplete="address-level2"
              placeholder="z. B. Hedingen (CH)"
              value={state.shoppingLocationLabel}
              onChange={(e) => setShoppingLocationLabel(e.target.value)}
            />
            <p className="text-xs text-on-surface-variant/80">
              Dient regionalen Hinweisen — z. B. wenn du auf Zutaten{" "}
              <span className="font-semibold">Auch einkaufen</span> nutzt und
              passende Zusatz-Zutaten vorgeschlagen werden.
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Groq API
          </h3>
          <div className="space-y-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
            <label
              htmlFor="groq-api-key"
              className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant"
            >
              API-Key
            </label>
            <input
              id="groq-api-key"
              className={fieldClass}
              type="password"
              autoComplete="off"
              placeholder="gsk_..."
              value={groqApiKeyDraft}
              onChange={(e) => {
                const next = e.target.value;
                setGroqApiKeyDraft(next);
                setGroqApiKey(next);
              }}
            />
            <p className="text-xs text-on-surface-variant/80">
              {hasOwnGroqApiKey ? (
                <>
                  Danke fürs Hinzufügen vom Key! ❤️ Geile Siäch!
                  <br />
                  <br />
                  Nur als Referenz, deinen Groq-API-Key lässt sich hier
                  verwalten:{" "}
                </>
              ) : (
                <>
                  Du nutzt zur Zeit einen Key, der mit anderen Nutzern geteilt
                  wird. Falls diese zur gleichen Zeit wie du Rezepte generieren,
                  kann die Generierung fehlschlagen.
                  <br />
                  <br />
                  Um die App ganz ungestört zu nutzen, hinterlege einen eigenen
                  Groq-API-Key. Den Key bekommst du hier:{" "}
                </>
              )}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                https://console.groq.com/keys
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
