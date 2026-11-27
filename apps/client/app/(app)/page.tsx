"use client";

import React from "react";
import Link from "next/link";
import { ImportWizard, Skeleton, StatTile, StatusBadge } from "@ims/ui";
import { useEntitlements, FeatureGate } from "@/lib/entitlements";
import { ShieldCheck, Users, KeyRound, History, Cpu, Boxes, Package, ShoppingCart } from "lucide-react";

export default function DashboardPage() {
  const { me, isLoading, hasFeature, hasPermission } = useEntitlements();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 rounded-[12px]" />
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
          <StatusBadge label={me?.subscriptionStatus ?? "ACTIVE"} tone="success" />
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
          label="Currency & TZ"
          value={`${me?.baseCurrency ?? "USD"} · ${me?.timezone ?? "UTC"}`}
          hint="Tenant accounting configuration"
          mono
        />
      </div>

      {/* Mobile Quick Business Actions */}
      {(hasFeature("PARTS") ||
        hasFeature("STOCK") ||
        hasFeature("SALES") ||
        hasFeature("PURCHASING")) && (
        <div className="space-y-2 md:hidden">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Business Actions
          </div>
          <div className="grid grid-cols-2 gap-3">
            {hasFeature("PARTS") && (
              <Link href="/parts" className="ims-nav-card-featured p-3.5">
                <Cpu className="h-5 w-5 text-[var(--brand-primary)]" />
                <div className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                  Check Items &amp; Price
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  Search SKUs &amp; prices
                </p>
              </Link>
            )}
            {hasFeature("STOCK") && (
              <Link href="/stock" className="ims-nav-card p-3.5">
                <Boxes className="h-5 w-5 text-[var(--brand-primary)]" />
                <div className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                  Stock &amp; Scan
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  Count, adjust &amp; move
                </p>
              </Link>
            )}
            {hasFeature("SALES") && (
              <Link href="/sales" className="ims-nav-card p-3.5">
                <Package className="h-5 w-5 text-[var(--brand-primary)]" />
                <div className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                  Sales Orders
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  Create &amp; ship orders
                </p>
              </Link>
            )}
            {hasFeature("PURCHASING") && (
              <Link href="/purchasing" className="ims-nav-card p-3.5">
                <ShoppingCart className="h-5 w-5 text-[var(--brand-primary)]" />
                <div className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                  Purchase Orders
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                  Receive inbound stock
                </p>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Navigation & Administration Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {hasFeature("PARTS") && (
          <Link href="/parts" className="ims-nav-card-featured">
            <Cpu className="h-5 w-5 text-[var(--brand-primary)]" />
            <div className="ims-nav-card-title">Parts Catalog</div>
            <p className="ims-nav-card-desc">
              Hierarchical categories, revisions, variants, and Indriya parameters.
            </p>
          </Link>
        )}
        {hasPermission("ADMIN:VIEW") && (
          <>
            <Link href="/settings/users" className="ims-nav-card">
              <Users className="h-5 w-5 text-[var(--brand-primary)]" />
              <div className="ims-nav-card-title">Users &amp; Invitations</div>
              <p className="ims-nav-card-desc">
                Invite team members and manage multi-role assignments.
              </p>
            </Link>

            <Link href="/settings/roles" className="ims-nav-card">
              <ShieldCheck className="h-5 w-5 text-[var(--brand-primary)]" />
              <div className="ims-nav-card-title">Roles &amp; RBAC Matrix</div>
              <p className="ims-nav-card-desc">
                Granular domain permissions filtered by enabled entitlements.
              </p>
            </Link>

            {hasFeature("API_ACCESS") && (
              <Link href="/settings/api-tokens" className="ims-nav-card">
                <KeyRound className="h-5 w-5 text-[var(--brand-primary)]" />
                <div className="ims-nav-card-title">API Access Tokens</div>
                <p className="ims-nav-card-desc">
                  Generate SHA-256 hashed tokens with scoped permissions.
                </p>
              </Link>
            )}

            <Link href="/settings/audit-log" className="ims-nav-card">
              <History className="h-5 w-5 text-[var(--brand-primary)]" />
              <div className="ims-nav-card-title">Immutable Audit Log</div>
              <p className="ims-nav-card-desc">
                Inspect before/after field diffs and export compliance CSVs.
              </p>
            </Link>
          </>
        )}
      </div>

      {/* Phase 0 Generic Import Wizard Demo (Desktop/Tablet) */}
      <div className="hidden md:block">
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
    </div>
  );
}
