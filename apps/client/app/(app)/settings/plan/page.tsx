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
      <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-[#18181B]">
                {me?.planName ?? "Starter"} Plan
              </h2>
              <StatusBadge
                label={me?.subscriptionStatus ?? "ACTIVE"}
                tone="success"
              />
            </div>
            <p className="mt-1 text-[13px] text-[#52525B]">
              Read-only view of your tenant&apos;s active feature entitlements and resource quotas.
            </p>
          </div>
          {me?.subscriptionEndsAt && (
            <div className="text-right text-[12px] text-[#63636B]">
              Trial / Term Ends:{" "}
              <span className="font-mono font-medium text-[#18181B]">
                {new Date(me.subscriptionEndsAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quotas & Usage Bars */}
      <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-6">
        <h3 className="text-[15px] font-semibold text-[#18181B]">
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
                className="rounded-[10px] border border-[#E4E4E7] p-4"
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#18181B]">
                    {lf.description}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {used} / {limit}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F4F4F5]">
                  <div
                    className={`h-full rounded-full ${
                      nearLimit ? "bg-[#92400E]" : "bg-[#1D4ED8]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#63636B]">
                  <span className="font-mono">{lf.featureKey}</span>
                  <span>Source: {lf.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Entitlements Table */}
      <div className="rounded-[12px] border border-[#E4E4E7] bg-white">
        <div className="border-b border-[#E4E4E7] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#18181B]">
            Module Entitlements
          </h3>
        </div>
        <div className="divide-y divide-[#E4E4E7]">
          {booleanFeatures.map((bf) => (
            <div
              key={bf.featureKey}
              className="flex items-center justify-between px-6 py-3.5 text-[13px]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-[#18181B]">
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
                <p className="mt-0.5 text-[12px] text-[#52525B]">
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
