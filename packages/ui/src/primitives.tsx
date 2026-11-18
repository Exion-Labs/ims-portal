import React from "react";
import { cn } from "./utils";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "primary" | "violet";

const TONE_STYLES: Record<BadgeTone, string> = {
  success: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
  warning: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
  danger: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
  neutral: "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]",
  primary: "bg-[#EEF2FF] text-[#1D4ED8] border-[#C7D2FE]",
  violet: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]",
};

const DOT_STYLES: Record<BadgeTone, string> = {
  success: "bg-[#166534]",
  warning: "bg-[#92400E]",
  danger: "bg-[#991B1B]",
  neutral: "bg-[#63636B]",
  primary: "bg-[#1D4ED8]",
  violet: "bg-[#6D28D9]",
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
      ? "text-[#991B1B]"
      : tone === "warning"
        ? "text-[#92400E]"
        : tone === "success"
          ? "text-[#166534]"
          : "text-[#18181B]";

  return (
    <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-4">
      <div className="text-[12px] font-medium text-[#52525B]">{label}</div>
      <div
        className={cn(
          "mt-1 text-[22px] font-semibold tracking-tight tabular-nums",
          valueColor,
          mono && "font-mono text-[18px]"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[12px] text-[#63636B]">{hint}</div>}
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
    <div className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[#E4E4E7] bg-white px-6 py-12 text-center">
      <div className="text-[15px] font-semibold text-[#18181B]">{title}</div>
      <p className="mt-1 max-w-md text-[13px] text-[#52525B]">{description}</p>
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
    <div className="rounded-[12px] border border-[#FECACA] bg-[#FEE2E2]/50 p-6 text-[#991B1B]">
      <div className="text-[15px] font-semibold">{title}</div>
      <p className="mt-1 text-[13px]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center rounded-[8px] border border-[#991B1B]/30 bg-white px-3 text-[13px] font-medium text-[#991B1B] hover:bg-[#FEE2E2]"
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
    <div className="mx-auto my-12 max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-8 text-center shadow-xs">
      <StatusBadge label={`Feature · ${featureKey}`} tone="warning" />
      <h2 className="mt-4 text-[18px] font-semibold text-[#18181B]">
        Not included in your current plan
      </h2>
      <p className="mt-2 text-[13px] text-[#52525B]">
        {description ??
          `This module requires the ${featureKey} capability, which is not enabled on your ${planName ?? "current"} subscription.`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <a
          href="/settings/plan"
          className="inline-flex h-9 items-center rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
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
    <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#18181B] px-4 py-2 text-[13px] text-white shadow-lg">
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
