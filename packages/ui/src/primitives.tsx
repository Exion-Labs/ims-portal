import React from "react";
import { cn } from "./utils";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "primary" | "violet";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-[var(--status-success-bg,#DCFCE7)] text-[var(--status-success-fg,#166534)] border-[var(--border-success,#BBF7D0)]",
  warning: "bg-[var(--status-warning-bg,#FEF3C7)] text-[var(--status-warning-fg,#92400E)] border-[var(--border-warning,#FDE68A)]",
  danger: "bg-[var(--status-danger-bg,#FEE2E2)] text-[var(--status-danger-fg,#991B1B)] border-[var(--border-danger,#FECACA)]",
  neutral: "bg-[var(--bg-muted,#F4F4F5)] text-[var(--text-secondary,#52525B)] border-[var(--border-subtle,#E4E4E7)]",
  primary: "bg-[var(--brand-tint,#EEF2FF)] text-[var(--brand-primary,#1D4ED8)] border-[var(--border-brand,#C7D2FE)]",
  violet: "bg-[var(--status-violet-bg,#EDE9FE)] text-[var(--status-violet-fg,#6D28D9)] border-[var(--border-violet,#DDD6FE)]",
};

const DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-[var(--status-success-fg,#166534)]",
  warning: "bg-[var(--status-warning-fg,#92400E)]",
  danger: "bg-[var(--status-danger-fg,#991B1B)]",
  neutral: "bg-[var(--text-muted,#63636B)]",
  primary: "bg-[var(--brand-primary,#1D4ED8)]",
  violet: "bg-[var(--status-violet-fg,#6D28D9)]",
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium leading-4",
        TONE_STYLES[tone],
        className
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[tone])} />}
      <span>{label}</span>
    </span>
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
      ? "text-[var(--status-danger-fg),#991B1B]"
      : tone === "warning"
        ? "text-[var(--status-warning-fg),#92400E]"
        : tone === "success"
          ? "text-[var(--status-success-fg),#166534]"
          : "text-[var(--text-primary),#18181B]";

  return (
    <div
      title={hint}
      className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--border-subtle),#E4E4E7] bg-white px-3 py-2"
    >
      <span className="truncate text-[12px] font-medium text-[var(--text-secondary),#52525B]">{label}</span>
      <span
        className={cn(
          "max-w-[60%] shrink-0 truncate text-[14px] font-semibold tracking-tight tabular-nums",
          valueColor,
          mono && "font-mono text-[13px]"
        )}
      >
        {value}
      </span>
    </div>
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
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border-subtle),#E4E4E7] bg-white px-6 py-12 text-center">
      <div className="text-[15px] font-semibold text-[var(--text-primary),#18181B]">{title}</div>
      <p className="mt-1 max-w-md text-[13px] text-[var(--text-secondary),#52525B]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
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
    <div className="rounded-[12px] border border-[var(--border-danger),#FECACA] bg-[var(--status-danger-bg),#FEE2E2]/50 p-6 text-[var(--status-danger-fg),#991B1B]">
      <div className="text-[15px] font-semibold">{title}</div>
      <p className="mt-1 text-[13px]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center rounded-[8px] border border-[var(--status-danger-fg),#991B1B]/30 bg-white px-3 text-[13px] font-medium text-[var(--status-danger-fg),#991B1B] hover:bg-[var(--status-danger-bg),#FEE2E2]"
        >
          Retry
        </button>
      )}
    </div>
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
    <div className="mx-auto my-12 max-w-lg rounded-[12px] border border-[var(--border-subtle),#E4E4E7] bg-white p-8 text-center shadow-xs">
      <StatusBadge label={`Feature · ${featureKey}`} tone="warning" />
      <h2 className="mt-4 text-[18px] font-semibold text-[var(--text-primary),#18181B]">
        Not included in your current plan
      </h2>
      <p className="mt-2 text-[13px] text-[var(--text-secondary),#52525B]">
        {description ??
          `This module requires the ${featureKey} capability, which is not enabled on your ${planName ?? "current"} subscription.`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <a
          href="/settings/plan"
          className="inline-flex h-9 items-center rounded-[8px] bg-[var(--brand-primary),#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover),#1E40AF]"
        >
          View Plan & Features
        </a>
      </div>
    </div>
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
    <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--text-primary),#18181B] px-4 py-2 text-[13px] text-white shadow-lg">
      <span className="font-medium tabular-nums">{selectedCount} selected</span>
      <span className="h-4 w-px bg-white/20" />
      <div className="flex items-center gap-2">{children}</div>
      <span className="h-4 w-px bg-white/20" />
      <button
        type="button"
        onClick={onClear}
        className="rounded-full px-2.5 py-1 text-[12px] text-zinc-300 hover:bg-white/10 hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[12px] border border-[var(--border-subtle,#E4E4E7)] bg-[var(--bg-surface,#FFFFFF)] p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  maxWidthClass = "max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-[12px] border border-[var(--border-subtle,#E4E4E7)] bg-[var(--bg-surface,#FFFFFF)] p-6 shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle,#E4E4E7)] pb-3">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary,#18181B)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded p-1 text-[var(--text-muted,#63636B)] hover:bg-[var(--bg-canvas,#F7F7F8)]"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
