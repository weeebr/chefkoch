import { useEffect, useMemo, useState } from "react";
import type { RecipeDetail } from "../types";
import { ingredientQuantityShareLabels } from "../utils/ingredientSharePercents";
import { scaleQuantityString } from "../utils/scaleQuantityString";

export function useRecipeScaling(detail: RecipeDetail, recipeId: string) {
  const [scalingId, setScalingId] = useState<string | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  const scalingKey = scalingId ?? detail.defaultScalingId;
  const resolvedMode: "percent" | "portions" =
    scalingKey === "percent" ? "percent" : "portions";
  const basePortions = Math.max(1, detail.basePortions);

  useEffect(() => {
    setScaleFactor(1);
    setScalingId(null);
  }, [recipeId]);

  const minFactor = 1 / basePortions;
  const maxFactor = Math.min(99 / basePortions, 10);

  const clampFactor = (f: number) =>
    Math.min(maxFactor, Math.max(minFactor, f));

  const displayPortions = Math.max(
    1,
    Math.min(99, Math.round(scaleFactor * basePortions)),
  );
  const displayPercent = Math.round(scaleFactor * 1000) / 10;

  const displayIngredients = useMemo(() => {
    const rows = detail.ingredients;
    if (resolvedMode === "percent") {
      const shares = ingredientQuantityShareLabels(rows.map((r) => r.quantity));
      return rows.map((row, i) => ({
        ...row,
        quantity: shares[i] ?? "—",
      }));
    }
    return rows.map((row) => ({
      ...row,
      quantity: scaleQuantityString(row.quantity, scaleFactor),
    }));
  }, [detail.ingredients, resolvedMode, scaleFactor]);

  const setPortionsFromInput = (n: number) => {
    if (!Number.isFinite(n)) return;
    const p = Math.max(1, Math.min(99, Math.round(n)));
    setScaleFactor(clampFactor(p / basePortions));
  };

  const setPercentFromInput = (n: number) => {
    if (!Number.isFinite(n)) return;
    const pc = Math.max(10, Math.min(500, Math.round(n * 10) / 10));
    setScaleFactor(clampFactor(pc / 100));
  };

  return {
    scalingId,
    setScalingId,
    resolvedMode,
    scaleFactor,
    basePortions,
    displayPortions,
    displayPercent,
    displayIngredients,
    setPortionsFromInput,
    setPercentFromInput,
  };
}
