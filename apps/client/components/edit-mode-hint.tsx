"use client";

import React from "react";
import { Lock } from "lucide-react";
import { Alert, Button } from "@ims/ui";
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
    <Alert className={`flex items-center gap-1.5 rounded-[8px] bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground ${className}`}>
      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span>
        Edits locked —{" "}
        <Button
          type="button"
          variant="link"
          onClick={() => setEditMode(true)}
          className="h-auto p-0 text-[11px] font-medium"
        >
          Enable Edit Mode
        </Button>{" "}
        to {actionDescription}.
      </span>
    </Alert>
  );
}
