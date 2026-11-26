import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "./utils";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "primary" | "violet";

const TONE_TO_VARIANT: Record<
  BadgeTone,
  "success" | "warning" | "destructive" | "secondary" | "primary" | "violet"
> = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  neutral: "secondary",
  primary: "primary",
  violet: "violet",
};

const DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-[var(--status-success-fg)]",
  warning: "bg-[var(--status-warning-fg)]",
  danger: "bg-[var(--status-danger-fg)]",
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  violet: "bg-[var(--status-violet-fg)]",
};

export function StatusBadge({
  label,
  tone = "neutral",
  showDot = true,
  className,
}: {
  label: string;
  tone?: BadgeTone;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <Badge variant={TONE_TO_VARIANT[tone]} className={className}>
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[tone])} />}
      <span>{label}</span>
    </Badge>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  mono?: boolean;
}) {
  const valueColor =
    tone === "danger"
      ? "text-[var(--status-danger-fg)]"
      : tone === "warning"
        ? "text-[var(--status-warning-fg)]"
        : tone === "success"
          ? "text-[var(--status-success-fg)]"
          : "text-foreground";

  return (
    <Card
      title={hint}
      className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2"
    >
      <span className="truncate text-[12px] font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-[60%] shrink-0 truncate text-[14px] font-semibold tracking-tight tabular-nums",
          valueColor,
          mono && "font-mono text-[13px]"
        )}
      >
        {value}
      </span>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
      <div className="text-[15px] font-semibold text-foreground">{title}</div>
      <p className="mt-1 max-w-md text-[13px] text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive" className="rounded-[12px] p-5">
      <AlertCircle className="size-4" />
      <AlertTitle className="text-[15px]">{title}</AlertTitle>
      <AlertDescription className="mt-1 space-y-3">
        <p>{message}</p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-[var(--status-danger-fg)]/30 bg-card text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
          >
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function NotInPlan({
  featureKey,
  planName,
  description,
}: {
  featureKey: string;
  planName?: string;
  description?: string;
}) {
  return (
    <Card className="mx-auto my-12 max-w-lg p-8 text-center shadow-xs">
      <StatusBadge label={`Feature · ${featureKey}`} tone="warning" className="mx-auto" />
      <h2 className="mt-4 text-[18px] font-semibold text-foreground">
        Not included in your current plan
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {description ??
          `This module requires the ${featureKey} capability, which is not enabled on your ${planName ?? "current"} subscription.`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button asChild>
          <a href="/settings/plan">View Plan &amp; Features</a>
        </Button>
      </div>
    </Card>
  );
}

export function BulkActionBar({
  selectedCount,
  onClear,
  children,
}: {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (selectedCount <= 0) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 overflow-x-auto rounded-full bg-foreground px-4 py-2 text-[13px] text-background shadow-lg lg:bottom-5">
      <span className="font-medium tabular-nums">{selectedCount} selected</span>
      <span className="h-4 w-px bg-background/20" />
      <div className="flex items-center gap-2">{children}</div>
      <span className="h-4 w-px bg-background/20" />
      <button
        type="button"
        onClick={onClear}
        className="rounded-full px-2.5 py-1 text-[12px] opacity-80 hover:bg-background/10 hover:opacity-100"
      >
        Clear
      </button>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  maxWidthClass = "sm:max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={maxWidthClass}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
