import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

type MissingIngredientsSummaryProps = {
  names: string[];
  textClassName?: string;
};

function buildCandidate(names: string[], shownCount: number): string {
  const shown = names.slice(0, shownCount).map((x) => x.trim()).filter(Boolean);
  if (shown.length === 0) return "";
  const remaining = Math.max(0, names.length - shown.length);
  if (shown.length === 1) {
    return remaining > 0 ? `${shown[0]} +${remaining}` : shown[0];
  }
  const base = shown.join(", ");
  return remaining > 0 ? `${base}, +${remaining}` : base;
}

function fitMissingText(names: string[], maxWidth: number, font: string): string {
  if (names.length === 0) return "";
  if (maxWidth <= 0) return buildCandidate(names, 1);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return buildCandidate(names, 1);
  ctx.font = font;

  for (let shownCount = names.length; shownCount >= 1; shownCount--) {
    const candidate = buildCandidate(names, shownCount);
    if (ctx.measureText(candidate).width <= maxWidth) return candidate;
  }
  return buildCandidate(names, 1);
}

export function MissingIngredientsSummary({
  names,
  textClassName = "",
}: MissingIngredientsSummaryProps) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [fitted, setFitted] = useState("");

  const sanitized = useMemo(
    () => names.map((x) => x.trim()).filter((x) => x.length > 0),
    [names],
  );

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const compute = () => {
      const style = window.getComputedStyle(el);
      const font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const next = fitMissingText(sanitized, el.clientWidth, font);
      setFitted(next);
    };
    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [sanitized]);

  return (
    <span className="flex min-w-0 items-center gap-x-2 overflow-hidden">
      <MaterialIcon
        name="shopping_cart"
        className="shrink-0 text-[14px] text-primary-dim"
      />
      <span
        ref={textRef}
        className={`truncate text-xs font-bold uppercase tracking-tighter text-primary-dim ${textClassName}`.trim()}
      >
        {fitted}
      </span>
    </span>
  );
}
