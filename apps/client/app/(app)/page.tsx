"use client";

import React from "react";
import Link from "next/link";
import { ImportWizard, StatTile, StatusBadge } from "@ims/ui";
import { useEntitlements, FeatureGate } from "@/lib/entitlements";
import { ShieldCheck, Users, KeyRound, History, Cpu } from "lucide-react";

export default function DashboardPage() {
  const { me, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--border-subtle)]" />
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
          <h1 className="ims-page-title">Workspace Overview</h1>
          <p className="ims-page-subtitle">
            Multi-tenant foundation active for{" "}
            <strong className="text-[var(--text-primary)]">{me?.tenantName}</strong> (
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
          label="Parts in Catalog"
          value={`${me?.usage?.MAX_PARTS ?? 0} / ${me?.limits?.MAX_PARTS ?? "—"}`}
          hint="Active parts vs plan quota"
        />
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
          label="Base Currency & Timezone"
          value={`${me?.baseCurrency ?? "USD"} · ${me?.timezone ?? "UTC"}`}
          hint="Tenant accounting configuration"
          mono
        />
      </div>

      {/* Quick Navigation & Administration Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link href="/parts" className="ims-nav-card-featured">
          <Cpu className="h-5 w-5 text-[var(--brand-primary)]" />
          <div className="ims-nav-card-title">Parts Catalog</div>
          <p className="ims-nav-card-desc">
            Hierarchical categories, revisions, variants, and Indriya parameters.
          </p>
        </Link>
        <Link href="/settings/users" className="ims-nav-card">
          <Users className="h-5 w-5 text-[var(--brand-primary)]" />
          <div className="ims-nav-card-title">Users & Invitations</div>
          <p className="ims-nav-card-desc">
            Invite team members and manage multi-role assignments.
          </p>
        </Link>

        <Link href="/settings/roles" className="ims-nav-card">
          <ShieldCheck className="h-5 w-5 text-[var(--brand-primary)]" />
          <div className="ims-nav-card-title">Roles & RBAC Matrix</div>
          <p className="ims-nav-card-desc">
            Granular domain permissions filtered by enabled entitlements.
          </p>
        </Link>

        <Link href="/settings/api-tokens" className="ims-nav-card">
          <KeyRound className="h-5 w-5 text-[var(--brand-primary)]" />
          <div className="ims-nav-card-title">API Access Tokens</div>
          <p className="ims-nav-card-desc">
            Generate SHA-256 hashed tokens with scoped permissions.
          </p>
        </Link>

        <Link href="/settings/audit-log" className="ims-nav-card">
          <History className="h-5 w-5 text-[var(--brand-primary)]" />
          <div className="ims-nav-card-title">Immutable Audit Log</div>
          <p className="ims-nav-card-desc">
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
