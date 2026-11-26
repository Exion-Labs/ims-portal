"use client";

import { useCallback, useRef } from "react";

/**
 * Keeps a single Idempotency-Key stable across retries/re-submissions of the same logical
 * form or modal action. Call `reset()` only after the operation succeeds (or the modal closes).
 */
export function useIdempotencyKey() {
  const keyRef = useRef<string | null>(null);

  if (keyRef.current === null && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    keyRef.current = crypto.randomUUID();
  }

  const getKey = useCallback(() => {
    if (keyRef.current === null && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      keyRef.current = crypto.randomUUID();
    }
    return keyRef.current ?? undefined;
  }, []);

  const reset = useCallback(() => {
    keyRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : null;
  }, []);

  return { getKey, reset };
}
