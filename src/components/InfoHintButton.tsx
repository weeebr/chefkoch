import { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

type InfoHintButtonProps = {
  text: string;
  label: string;
  popoverAlign?: "left" | "center" | "right";
  buttonClassName?: string;
};

export function InfoHintButton({
  text,
  label,
  popoverAlign = "right",
  buttonClassName = "",
}: InfoHintButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex normal-case tracking-normal">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={label}
        className={[
          "inline-flex h-7 w-7 items-center justify-center rounded-full text-secondary-dim transition-colors active:bg-secondary-lighter/35 active:text-on-secondary-fixed",
          buttonClassName,
        ].join(" ")}
      >
        <MaterialIcon name="help" className="text-lg" />
      </button>
      {open ? (
        <span
          className={[
            "absolute top-7 z-20 w-[min(16rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-lg border border-outline-variant/25 bg-surface-container-high px-3 py-2 text-left font-body text-xs leading-relaxed normal-case tracking-normal text-on-surface shadow-lg",
            popoverAlign === "left"
              ? "left-0"
              : popoverAlign === "center"
                ? "left-1/2 -translate-x-1/2"
                : "right-0",
          ].join(" ")}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
