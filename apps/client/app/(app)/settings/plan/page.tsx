"use client";

import React from "react";
import { StatusBadge } from "@ims/ui";
import { useEntitlements } from "@/lib/entitlements";

export default function PlanAndFeaturesPage() {
  const { me } = useEntitlements();

  const booleanFeatures =
    me?.featureDetails.filter((f) => f.type === "BOOLEAN") ?? [];
  const limitFeatures =
    me?.featureDetails.filter((f) => f.type === "LIMIT") ?? [];

  return (
    <div className="space-y-6">
      {/* Plan Header Card */}
      <div className="ims-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                {me?.planName ?? "Starter"} Plan
              </h2>
              <StatusBadge
                label={me?.subscriptionStatus ?? "ACTIVE"}
                tone="success"
              />
            </div>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Read-only view of your tenant&apos;s active feature entitlements and resource quotas.
            </p>
          </div>
          {me?.subscriptionEndsAt && (
            <div className="text-right text-[12px] text-[var(--text-muted)]">
              Trial / Term Ends:{" "}
              <span className="font-mono font-medium text-[var(--text-primary)]">
                {new Date(me.subscriptionEndsAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quotas & Usage Bars */}
      <div className="ims-card p-6">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
          Quotas & Resource Usage
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {limitFeatures.map((lf) => {
            const limit = lf.limitValue ?? 0;
            const used = me?.usage?.[lf.featureKey] ?? 0;
            const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            const nearLimit = pct >= 80;

            return (
              <div
                key={lf.featureKey}
                className="rounded-[10px] border border-[var(--border-subtle)] p-4"
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[var(--text-primary)]">
                    {lf.description}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {used} / {limit}
                  </span>
                </div>
                <div className="mt-2">
                  <progress
                    value={used}
                    max={limit > 0 ? limit : 1}
                    className={`ims-progress ${nearLimit ? "ims-progress-warning" : ""}`}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span className="font-mono">{lf.featureKey}</span>
                  <span>Source: {lf.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Entitlements Table */}
      <div className="rounded-[12px] border border-[var(--border-subtle)] bg-white">
        <div className="border-b border-[var(--border-subtle)] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Module Entitlements
          </h3>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {booleanFeatures.map((bf) => (
            <div
              key={bf.featureKey}
              className="flex items-center justify-between px-6 py-3.5 text-[13px]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    {bf.featureKey}
                  </span>
                  <StatusBadge
                    label={bf.source}
                    tone={
                      bf.source.startsWith("OVERRIDE") ? "violet" : "neutral"
                    }
                    showDot={false}
                  />
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  {bf.description}
                </p>
              </div>
              <StatusBadge
                label={bf.enabled ? "Enabled" : "Not in plan"}
                tone={bf.enabled ? "success" : "neutral"}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
