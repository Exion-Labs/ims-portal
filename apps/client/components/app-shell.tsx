"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  Cpu,
  Factory,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Search,
  Settings,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { StatusBadge } from "@ims/ui";
import { useEntitlements } from "@/lib/entitlements";
import { CommandPalette } from "./command-palette";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: string;
  permission?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    group: "Inventory",
    items: [
      { label: "Parts Catalog", href: "/parts", icon: Cpu, feature: "PARTS" },
      { label: "Stock & Locations", href: "/stock", icon: Boxes, feature: "STOCK" },
    ],
  },
  {
    group: "Purchasing",
    items: [
      { label: "Companies & Suppliers", href: "/companies", icon: Building2, feature: "COMPANIES" },
      { label: "Purchase Orders", href: "/purchasing", icon: ShoppingCart, feature: "PURCHASING" },
    ],
  },
  {
    group: "Manufacturing",
    items: [
      { label: "Build Orders & BOM", href: "/manufacturing", icon: Factory, feature: "MANUFACTURING" },
    ],
  },
  {
    group: "Sales & Outbound",
    items: [
      { label: "Sales Orders", href: "/sales", icon: Package, feature: "SALES" },
      { label: "Transfers", href: "/transfers", icon: Truck, feature: "TRANSFERS" },
    ],
  },
  {
    group: "Admin",
    items: [
      {
        label: "Tenant Settings",
        href: "/settings/organization",
        icon: Settings,
        permission: "ADMIN:VIEW",
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, hasFeature, hasPermission } = useEntitlements();
  const [cmdOpen, setCmdOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const trialFeatures =
    me?.featureDetails.filter((f) => f.source === "OVERRIDE_TRIAL" && f.enabled) ?? [];

  return (
    <div className="flex min-h-screen bg-[#F7F7F8] text-[#18181B]">
      {/* Left Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#E4E4E7] bg-white">
        {/* Tenant Header */}
        <div className="border-b border-[#E4E4E7] px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="truncate text-[14px] font-semibold text-[#18181B]">
              {me?.tenantName ?? "Loading tenant…"}
            </span>
            {me?.planName && <StatusBadge label={me.planName} tone="primary" showDot={false} />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[#63636B]">
            <span>{me?.tenantSlug ?? "—"}</span>
            <span>·</span>
            <span>{me?.baseCurrency ?? "USD"}</span>
          </div>

          {/* ⌘K Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="mt-3 flex h-9 w-full items-center justify-between rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-3 text-[12px] text-[#63636B] hover:border-[#1D4ED8]/50 hover:text-[#18181B]"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Quick jump…</span>
            </span>
            <kbd className="rounded border border-[#E4E4E7] bg-white px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Feature-Aware Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.feature && !hasFeature(item.feature)) return false;
              if (item.permission && !hasPermission(item.permission)) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group}>
                <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#63636B]">
                  {group.group}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href) ||
                          (item.href.startsWith("/settings") && pathname.startsWith("/settings"));
                    const isTrialOverride = me?.featureDetails.some(
                      (f) => f.featureKey === item.feature && f.source === "OVERRIDE_TRIAL"
                    );

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex h-9 items-center justify-between rounded-[8px] px-2.5 text-[13px] font-medium transition-colors ${
                          active
                            ? "bg-[#EEF2FF] text-[#1D4ED8]"
                            : "text-[#52525B] hover:bg-[#F7F7F8] hover:text-[#18181B]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </span>
                        {isTrialOverride && (
                          <StatusBadge label="Trial" tone="violet" showDot={false} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Plan Card */}
        <div className="mx-3 mb-3 rounded-[10px] border border-[#E4E4E7] bg-[#F7F7F8] p-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-[#18181B]">
              {me?.planName ?? "Plan"} Plan
            </span>
            <Link
              href="/settings/plan"
              className="text-[12px] font-medium text-[#1D4ED8] hover:underline"
            >
              Plan & usage
            </Link>
          </div>
          {trialFeatures.length > 0 ? (
            <div className="mt-1 text-[11px] text-[#6D28D9]">
              {trialFeatures.length} active trial override(s)
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-[#63636B]">
              Users: {me?.usage?.MAX_USERS ?? 1} / {me?.limits?.MAX_USERS ?? "—"}
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="flex items-center justify-between border-t border-[#E4E4E7] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[#18181B]">
              {me?.fullName ?? "User"}
            </div>
            <div className="truncate text-[11px] text-[#63636B]">{me?.email ?? ""}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="rounded-[8px] p-2 text-[#52525B] hover:bg-[#F7F7F8] hover:text-[#991B1B]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#E4E4E7] bg-white px-6">
          <div className="flex items-center gap-2 text-[13px] text-[#52525B]">
            <span className="font-medium text-[#18181B]">{me?.tenantName ?? "IMS"}</span>
            <span>/</span>
            <span className="font-mono text-[12px] text-[#63636B]">{pathname}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {hasFeature("BARCODES") && (
              <button
                type="button"
                onClick={() => setCmdOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
              >
                <QrCode className="h-4 w-4 text-[#1D4ED8]" />
                <span>Scan</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
