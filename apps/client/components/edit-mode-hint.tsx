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
      className={`flex flex-wrap items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-2.5 py-1.5 text-[11px] text-[#63636B] ${className}`}
    >
      <Lock className="h-3 w-3 shrink-0 text-[#63636B]" />
      <span>
        Edits locked —{" "}
        <button
          type="button"
          onClick={() => setEditMode(true)}
          className="font-medium text-[#1D4ED8] hover:underline"
        >
          Enable Edit Mode
        </button>{" "}
        to {actionDescription}.
      </span>
    </div>
  );
}
