"use client";

import React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";
import { ApiError } from "@ims/api-client";

export { toast };

export function Toaster({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      visibleToasts={4}
      offset={16}
      toastOptions={{
        style: {
          borderRadius: "10px",
          fontSize: "13px",
          borderColor: "var(--border)",
        },
      }}
    />
  );
}

/**
 * Surfaces backend ApiError codes consistently as warning (plan/quota) or error toasts.
 */
export function toastApiError(err: unknown, fallbackTitle = "Action failed") {
  if (err instanceof ApiError) {
    if (err.code === "LIMIT_REACHED" || err.code === "FEATURE_NOT_ENABLED") {
      toast.warning(fallbackTitle, { description: err.message });
      return;
    }
    toast.error(fallbackTitle, { description: err.message });
    return;
  }
  toast.error(fallbackTitle, {
    description: err instanceof Error ? err.message : "An unexpected error occurred",
  });
}
