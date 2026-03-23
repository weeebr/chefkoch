/**
 * Turn recipe quantity strings into comparable weights, then into integer % shares
 * (sum 100 for rows with parseable weights).
 */

const NON_COMPARABLE = /^(n\.\s*b\.|n\.b\.|–|—|-|…|\.\.\.)$/i;

/**
 * Extract a single relative weight from a quantity line (first meaningful number,
 * or midpoint for ranges). Used only for comparing ingredients, not for unit accuracy.
 */
export function parseQuantityWeight(quantity: string): number | null {
  const q = quantity.trim();
  if (!q || !/\d/.test(q)) return null;
  if (NON_COMPARABLE.test(q.replace(/\s+/g, " "))) return null;

  const range = /(\d+)\s*[–-]\s*(\d+)/.exec(q);
  if (range) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    return (a + b) / 2;
  }

  const frac = /(\d+)\s*\/\s*(\d+)/.exec(q);
  if (frac) {
    const a = parseInt(frac[1], 10);
    const b = parseInt(frac[2], 10);
    if (b !== 0) return a / b;
  }

  const dec = /(\d+[.,]\d+)/.exec(q);
  if (dec) return parseFloat(dec[1].replace(",", "."));

  const int = /(\d+)/.exec(q);
  if (int) return parseInt(int[1], 10);

  return null;
}

function equalIntegerPercents(n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(100 / n);
  const rem = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Largest remainder method so shares sum to exactly 100. */
function distributeIntegerPercents(weights: (number | null)[]): (number | null)[] {
  const n = weights.length;
  const validIdx: number[] = [];
  const validW: number[] = [];
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    if (w !== null && w > 0) {
      validIdx.push(i);
      validW.push(w);
    }
  }

  if (validIdx.length === 0) {
    if (n === 0) return [];
    const eq = equalIntegerPercents(n);
    return eq.map((p) => p);
  }

  const sum = validW.reduce((a, b) => a + b, 0);

  const exact = validW.map((w) => (w / sum) * 100);
  const floors = exact.map((x) => Math.floor(x));
  let rem = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, j) => ({ j, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r);
  for (let k = 0; k < rem; k++) {
    floors[order[k].j]++;
  }

  const out: (number | null)[] = weights.map(() => null);
  validIdx.forEach((idx, k) => {
    out[idx] = floors[k] ?? 0;
  });
  return out;
}

/**
 * Display strings: `"42 %"` for comparable rows, `"—"` when no weight could be parsed
 * (still participates in equal split if nothing else parsed — handled by caller).
 */
export function ingredientQuantityShareLabels(quantities: string[]): string[] {
  if (quantities.length === 0) return [];

  const weights = quantities.map(parseQuantityWeight);
  const hasComparable = weights.some((w) => w !== null && w > 0);

  if (!hasComparable) {
    const eq = equalIntegerPercents(quantities.length);
    return quantities.map((_, i) => `${eq[i] ?? 0} %`);
  }

  const percents = distributeIntegerPercents(weights);
  return quantities.map((_, i) => {
    const p = percents[i];
    if (p === null) return "—";
    return `${p} %`;
  });
}
