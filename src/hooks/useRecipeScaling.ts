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
  const maxFactor = 99 / basePortions;

  const clampFactor = (f: number) =>
    Math.min(maxFactor, Math.max(minFactor, f));

  const isScaleAtFloor = scaleFactor <= minFactor + 1e-9;
  const isScaleAtCeiling = scaleFactor >= maxFactor - 1e-9;

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

  const displaySpices = useMemo(() => {
    const rows = detail.spices;
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
  }, [detail.spices, resolvedMode, scaleFactor]);

  /** Main + spice rows in display order (matches `matchRecipes` concatenation). */
  const displayMergedIngredientRows = useMemo(
    () => [...displayIngredients, ...displaySpices],
    [displayIngredients, displaySpices],
  );

  const setPortionsFromInput = (n: number) => {
    if (!Number.isFinite(n)) return;
    const p = Math.max(1, Math.min(99, Math.round(n)));
    setScaleFactor(clampFactor(p / basePortions));
  };

  const setPercentFromInput = (n: number) => {
    if (!Number.isFinite(n)) return;
    const pc = Math.max(1, Math.round(n * 10) / 10);
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
    displayMergedIngredientRows,
    isScaleAtFloor,
    isScaleAtCeiling,
    setPortionsFromInput,
    setPercentFromInput,
  };
}
