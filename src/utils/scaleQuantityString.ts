/**
 * Scale human-written ingredient amounts (German-style: comma decimals, g, ml, EL, ranges).
 * Non-numeric lines (—, …) are returned unchanged.
 */

const NON_SCALABLE = /^(n\.\s*b\.|n\.b\.|–|—|-|…|\.\.\.)$/i;
const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
};

function formatDeNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const rounded =
    Math.abs(n) >= 10
      ? Math.round(n * 10) / 10
      : Math.abs(n) >= 1
        ? Math.round(n * 100) / 100
        : Math.round(n * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return String(Math.round(rounded));
  }
  return String(rounded).replace(".", ",");
}

/**
 * Scale every standalone number or fraction in the string by `factor`.
 */
export function scaleQuantityString(quantity: string, factor: number): string {
  if (Math.abs(factor - 1) < 1e-9) return quantity;
  const q = quantity.trim();
  if (!q) return quantity;
  const hasUnicodeFraction = /[¼½¾]/.test(q);
  if (!/\d/.test(q) && !hasUnicodeFraction) return quantity;
  if (NON_SCALABLE.test(q.replace(/\s+/g, " "))) return quantity;

  return q.replace(
    /(\d+)\s*\/\s*(\d+)|(\d+[.,]\d+)|(\d+)|([¼½¾])/g,
    (full, g1, g2, g3, g4, g5) => {
      let v: number;
      if (g3 !== undefined) {
        v = parseFloat(g3.replace(",", ".")) * factor;
      } else if (g1 !== undefined && g2 !== undefined) {
        const a = parseInt(g1, 10);
        const b = parseInt(g2, 10);
        if (b === 0) return full;
        v = (a / b) * factor;
      } else if (g4 !== undefined) {
        v = parseInt(g4, 10) * factor;
      } else if (g5 !== undefined) {
        v = (UNICODE_FRACTIONS[g5] ?? NaN) * factor;
        if (!Number.isFinite(v)) return full;
      } else {
        return full;
      }
      return formatDeNumber(v);
    },
  );
}

/**
 * Scale *only measurement quantities* inside a natural language text.
 * This prevents scaling unrelated numbers like minutes/temperatures.
 */
export function scaleMeasurementQuantitiesInText(text: string, factor: number): string {
  if (Math.abs(factor - 1) < 1e-9) return text;
  if (!/\d/.test(text) && !/[¼½¾]/.test(text)) return text;

  const unitAlternatives =
    [
      "TL\\.?","EL\\.?","ml","l\\.?","g","kg","Liter\\b",
      "Teelöffel\\b","Esslöffel\\b","Prise\\b","Schuss\\b",
      "Stück\\b","Stk\\.?\\b","Scheiben?\\b","Zehen?\\b","Tassen?\\b",
    ].join("|");

  return text.replace(
    new RegExp(
      `((?:\\d+\\s*\\/\\s*\\d+)|(?:\\d+[\\.,]\\d+)|(?:\\d+)|[¼½¾])(\\s*(?:${unitAlternatives}))`,
      "gi",
    ),
    (_full, amount: string, unit: string) => `${scaleQuantityString(amount, factor)}${unit}`,
  );
}
