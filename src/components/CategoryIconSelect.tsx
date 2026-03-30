import { useEffect, useId, useRef, useState } from "react";
import { materialIconForCategory } from "../data/iconFromCategory";
import { ICON_CATEGORIES, type IconCategory } from "../types";
import { MaterialIcon } from "./MaterialIcon";

type CategoryIconSelectProps = {
  value: IconCategory;
  onChange: (c: IconCategory) => void;
  /** DOM id for the toggle button (label association). */
  buttonId?: string;
  /** Button surface — match form fields. */
  buttonClassName: string;
  /** z-index for open list above table rows. */
  listZClass?: string;
};

export function CategoryIconSelect({
  value,
  onChange,
  buttonId,
  buttonClassName,
  listZClass = "z-20",
}: CategoryIconSelectProps) {
  const autoId = useId();
  const controlId = buttonId ?? autoId;
  const listId = `${controlId}-listbox`;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative min-w-0" ref={wrapRef}>
      <button
        type="button"
        id={controlId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`flex w-full min-w-0 items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-on-surface ${buttonClassName}`}
        onClick={() => setOpen((o) => !o)}
      >
        <MaterialIcon
          name={materialIconForCategory(value)}
          className="shrink-0 text-lg text-secondary-dim"
        />
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <MaterialIcon
          name="expand_more"
          className={`shrink-0 text-on-surface-variant/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={controlId}
          className={`absolute left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-1 ${listZClass}`}
        >
          {ICON_CATEGORIES.map((c) => {
            const selected = c === value;
            return (
              <li key={c} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={
                    selected
                      ? "flex w-full items-center gap-2 bg-secondary-container/35 px-3 py-2.5 text-left text-sm font-medium text-on-secondary-container"
                      : "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-on-surface active:bg-surface-container-low"
                  }
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <MaterialIcon
                    name={materialIconForCategory(c)}
                    className="shrink-0 text-lg text-secondary-dim"
                  />
                  <span className="min-w-0 flex-1 leading-snug">{c}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
