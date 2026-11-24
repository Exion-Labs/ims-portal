"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useEntitlements } from "./entitlements";

const STORAGE_KEY = "ims.editMode";

interface EditModeContextValue {
  editMode: boolean;
  canUseEditMode: boolean;
  setEditMode: (value: boolean) => void;
  toggleEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextValue | null>(null);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { hasPermission } = useEntitlements();
  const canUseEditMode =
    hasPermission("PART:UPDATE") ||
    hasPermission("STOCK:UPDATE") ||
    hasPermission("ADMIN:VIEW");

  const [rawEditMode, setRawEditMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved === "true") {
      setRawEditMode(true);
    }
  }, []);

  const setEditMode = useCallback(
    (value: boolean) => {
      const next = canUseEditMode ? value : false;
      setRawEditMode(next);
      if (typeof window !== "undefined") {
        if (next) {
          window.sessionStorage.setItem(STORAGE_KEY, "true");
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    },
    [canUseEditMode]
  );

  const toggleEditMode = useCallback(() => {
    setEditMode(!rawEditMode);
  }, [rawEditMode, setEditMode]);

  const value = useMemo<EditModeContextValue>(
    () => ({
      editMode: canUseEditMode && rawEditMode,
      canUseEditMode,
      setEditMode,
      toggleEditMode,
    }),
    [canUseEditMode, rawEditMode, setEditMode, toggleEditMode]
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return ctx;
}
