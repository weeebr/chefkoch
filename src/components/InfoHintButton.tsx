import { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

type InfoHintButtonProps = {
  text: string;
  label: string;
};

export function InfoHintButton({ text, label }: InfoHintButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-secondary-dim transition-colors active:bg-secondary-lighter/35 active:text-on-secondary-fixed"
      >
        <MaterialIcon name="help" className="text-lg" />
      </button>
      {open ? (
        <span className="absolute right-0 top-7 z-20 w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-lg border border-outline-variant/25 bg-surface-container-high px-3 py-2 text-left font-body text-xs leading-relaxed text-on-surface shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  );
}
