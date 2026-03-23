import { useCallback, useEffect, useState } from "react";

/** Message state that clears automatically after `durationMs`. */
export function useAutoClearMessage(durationMs: number) {
  const [message, setMessage] = useState<string | null>(null);

  const clearMessage = useCallback(() => setMessage(null), []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(id);
  }, [message, durationMs]);

  const showMessage = useCallback((text: string) => {
    setMessage(text);
  }, []);

  return { message, showMessage, clearMessage };
}
