"use client";

import React from "react";
import { Lock } from "lucide-react";
import { useEditMode } from "@/lib/edit-mode";

export function EditModeHint({
  actionDescription = "rename, move, or delete",
  className = "",
}: {
  actionDescription?: string;
  className?: string;
}) {
  const { canUseEditMode, editMode, setEditMode } = useEditMode();

  if (!canUseEditMode || editMode) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] ${className}`}
    >
      <Lock className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
      <span>
        Edits locked —{" "}
        <button
          type="button"
          onClick={() => setEditMode(true)}
          className="font-medium text-[var(--brand-primary)] hover:underline"
        >
          Enable Edit Mode
        </button>{" "}
        to {actionDescription}.
      </span>
    </div>
  );
}
