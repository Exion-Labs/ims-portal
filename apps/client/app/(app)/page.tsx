"use client";

import React from "react";
import Link from "next/link";
import { ImportWizard, StatTile, StatusBadge } from "@ims/ui";
import { useEntitlements, FeatureGate } from "@/lib/entitlements";
import { ShieldCheck, Users, KeyRound, History } from "lucide-react";

export default function DashboardPage() {
  const { me, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[#E4E4E7]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-[12px] bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
            Workspace Overview
          </h1>
          <p className="mt-0.5 text-[14px] text-[#52525B]">
            Multi-tenant foundation active for{" "}
            <strong className="text-[#18181B]">{me?.tenantName}</strong> (
            <span className="font-mono text-[13px]">{me?.tenantSlug}</span>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge label={`Plan · ${me?.planName ?? "Starter"}`} tone="primary" />
          <StatusBadge label={me?.subscriptionStatus ?? "ACTIVE"} tone="success" />
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active Users"
          value={`${me?.usage?.MAX_USERS ?? 1} / ${me?.limits?.MAX_USERS ?? "—"}`}
          hint="Seat quota on current plan"
        />
        <StatTile
          label="Enabled Features"
          value={me?.enabledFeatures.length ?? 0}
          hint="Plan features + active overrides"
        />
        <StatTile
          label="Active API Tokens"
          value={me?.usage?.ACTIVE_API_TOKENS ?? 0}
          hint={`Rate limit: ${me?.limits?.API_RATE_PER_MIN ?? 60} req/min`}
        />
        <StatTile
          label="Base Currency & Timezone"
          value={`${me?.baseCurrency ?? "USD"} · ${me?.timezone ?? "UTC"}`}
          hint="Tenant accounting configuration"
          mono
        />
      </div>

      {/* Quick Administration Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/settings/users"
          className="rounded-[12px] border border-[#E4E4E7] bg-white p-4 transition-colors hover:border-[#1D4ED8]"
        >
          <Users className="h-5 w-5 text-[#1D4ED8]" />
          <div className="mt-3 text-[15px] font-semibold text-[#18181B]">
            Users & Invitations
          </div>
          <p className="mt-1 text-[13px] text-[#52525B]">
            Invite team members and manage multi-role assignments.
          </p>
        </Link>

        <Link
          href="/settings/roles"
          className="rounded-[12px] border border-[#E4E4E7] bg-white p-4 transition-colors hover:border-[#1D4ED8]"
        >
          <ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />
          <div className="mt-3 text-[15px] font-semibold text-[#18181B]">
            Roles & RBAC Matrix
          </div>
          <p className="mt-1 text-[13px] text-[#52525B]">
            Granular domain permissions filtered by enabled entitlements.
          </p>
        </Link>

        <Link
          href="/settings/api-tokens"
          className="rounded-[12px] border border-[#E4E4E7] bg-white p-4 transition-colors hover:border-[#1D4ED8]"
        >
          <KeyRound className="h-5 w-5 text-[#1D4ED8]" />
          <div className="mt-3 text-[15px] font-semibold text-[#18181B]">
            API Access Tokens
          </div>
          <p className="mt-1 text-[13px] text-[#52525B]">
            Generate SHA-256 hashed tokens with scoped permissions.
          </p>
        </Link>

        <Link
          href="/settings/audit-log"
          className="rounded-[12px] border border-[#E4E4E7] bg-white p-4 transition-colors hover:border-[#1D4ED8]"
        >
          <History className="h-5 w-5 text-[#1D4ED8]" />
          <div className="mt-3 text-[15px] font-semibold text-[#18181B]">
            Immutable Audit Log
          </div>
          <p className="mt-1 text-[13px] text-[#52525B]">
            Inspect before/after field diffs and export compliance CSVs.
          </p>
        </Link>
      </div>

      {/* Phase 0 Generic Import Wizard Demo */}
      <FeatureGate feature="IMPORT_EXPORT">
        <ImportWizard
          targetType="PartCatalogPreview"
          targetFields={[
            { key: "ipn", label: "Internal Part Number (IPN)", required: true },
            { key: "name", label: "Part Name", required: true },
            { key: "category", label: "Category Path", required: false },
            { key: "unit", label: "Unit of Measure", required: false },
          ]}
        />
      </FeatureGate>
    </div>
  );
}
