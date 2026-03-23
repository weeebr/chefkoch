import type { RecipeMatchCard, RecipeListRow } from "../types";
import {
  recipeMatchKind,
  recipeMissingCount,
  recipeMissingIngredients,
} from "./matchRecipes";
import type { AppState } from "./schema";
import { GROQ_RECIPES_PER_BATCH } from "../features/groq/groqConstants";

/** Cards for Zutaten → Passende Rezepte (filtered by multi-select + full ingredient match). */
export function selectMatchingRecipeCards(state: AppState): RecipeMatchCard[] {
  const orderIndex = new Map(
    state.zutatenScreenRecipeOrder.map((id, i) => [id, i]),
  );

  const maxMissing = 2;
  const maxMissingForDisplay = maxMissing + 1;
  const alwaysShowNewestCount = GROQ_RECIPES_PER_BATCH;

  const matchedRows = state.recipeRows
    .map((row) => {
      const match = recipeMatchKind(row.id, state, maxMissing);
      const orderPos = orderIndex.get(row.id);
      const isNewestGenerated =
        orderPos !== undefined && orderPos < alwaysShowNewestCount;
      if (match) {
        return { row, match, orderPos };
      }
      if (!isNewestGenerated) {
        return null;
      }
      const missing = recipeMissingCount(row.id, state);
      return {
        row,
        orderPos,
        match: {
          matchMissingCount: missing,
          matchKind: missing === 0 ? ("full" as const) : ("partial" as const),
        },
      };
    })
    .filter((x): x is { row: (typeof state.recipeRows)[number]; match: NonNullable<ReturnType<typeof recipeMatchKind>> | { matchMissingCount: number; matchKind: "full" | "partial" }; orderPos: number | undefined } => {
      return Boolean(x);
    })
    .sort((a, b) => {
      const ia = a.orderPos;
      const ib = b.orderPos;
      const scoreA = ia !== undefined ? ia : 1000;
      const scoreB = ib !== undefined ? ib : 1000;
      if (scoreA !== scoreB) return scoreA - scoreB;
      // Tie-break: fewer missing ingredients first.
      if (a.match.matchMissingCount !== b.match.matchMissingCount) {
        return a.match.matchMissingCount - b.match.matchMissingCount;
      }
      return a.row.title.localeCompare(b.row.title, "de");
    });

  // Convert the matched rows into cards, carrying match info.
  const cards: RecipeMatchCard[] = [];
  for (const { row, match } of matchedRows) {
    const extras = state.recipeCardExtras[row.id] ?? { tag: "—" };
    const missingIngredients = recipeMissingIngredients(
      row.id,
      state,
      maxMissingForDisplay,
    );
    cards.push({
      id: row.id,
      title: row.title,
      minutes: row.minutes,
      tag: extras.tag,
      matchMissingCount: match.matchMissingCount,
      matchKind: match.matchKind,
      missingIngredients,
      status: row.status,
    });
  }

  return cards;
}

/** Bookmarked list rows in user bookmark order. */
export function selectBookmarkedRowsOrdered(state: AppState): RecipeListRow[] {
  const order = new Map(state.bookmarkedRecipeIds.map((id, i) => [id, i]));
  return state.recipeRows
    .filter((row) => state.bookmarkedRecipeIds.includes(row.id))
    .sort((a, b) => {
      const oa = order.get(a.id) ?? 0;
      const ob = order.get(b.id) ?? 0;
      return oa - ob;
    });
}
