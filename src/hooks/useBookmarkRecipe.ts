import { useCallback } from "react";
import { useAppData } from "../data/AppDataContext";
import {
  BOOKMARK_ARIA_ADD,
  BOOKMARK_ARIA_REMOVE,
  BOOKMARK_FEEDBACK_REMOVED,
  BOOKMARK_FEEDBACK_SAVED,
} from "./bookmarkStrings";
import { useAutoClearMessage } from "./useAutoClearMessage";

/** Bookmark toggle + feedback + aria label for a single recipe (e.g. detail screen). */
export function useBookmarkRecipe(recipeId: string) {
  const { state, toggleBookmarkRecipe } = useAppData();
  const { message, showMessage } = useAutoClearMessage(2800);
  const bookmarked = state.bookmarkedRecipeIds.includes(recipeId);

  const toggleBookmark = useCallback(() => {
    showMessage(bookmarked ? BOOKMARK_FEEDBACK_REMOVED : BOOKMARK_FEEDBACK_SAVED);
    toggleBookmarkRecipe(recipeId);
  }, [bookmarked, recipeId, showMessage, toggleBookmarkRecipe]);

  return {
    bookmarked,
    toggleBookmark,
    feedbackMessage: message,
    bookmarkAriaLabel: bookmarked ? BOOKMARK_ARIA_REMOVE : BOOKMARK_ARIA_ADD,
  };
}
