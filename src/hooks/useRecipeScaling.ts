import { useEffect, useMemo, useState } from "react";
import type { RecipeDetail } from "../types";
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
    setScalingId("portions");
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
  const displayPercent = Math.max(100, Math.min(9900, displayPortions * 100));

  const displayIngredients = useMemo(() => {
    const rows = detail.ingredients;
    return rows.map((row) => ({
      ...row,
      quantity: scaleQuantityString(row.quantity, scaleFactor),
    }));
  }, [detail.ingredients, scaleFactor]);

  const displaySpices = useMemo(() => {
    const rows = detail.spices;
    return rows.map((row) => ({
      ...row,
      quantity: scaleQuantityString(row.quantity, scaleFactor),
    }));
  }, [detail.spices, scaleFactor]);

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
    const pc = Math.max(100, Math.min(9900, Math.floor(n)));
    const portions = Math.max(1, Math.min(99, Math.floor(pc / 100)));
    setScaleFactor(clampFactor(portions / basePortions));
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
