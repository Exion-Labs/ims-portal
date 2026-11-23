"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  User,
} from "lucide-react";
import { StatusBadge } from "@ims/ui";
import { NAV_GROUPS, SETTINGS_NAV } from "@/lib/constants";
import { useEntitlements } from "@/lib/entitlements";
import { CommandPalette } from "./command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, hasFeature, hasPermission } = useEntitlements();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const userInitial = (me?.fullName || me?.email || "U").trim().charAt(0).toUpperCase();

  const currentMenuLabel = (() => {
    if (pathname === "/") {
      return "Dashboard";
    }
    if (pathname.startsWith("/settings")) {
      const settingMatch = SETTINGS_NAV.find((item) => pathname.startsWith(item.href));
      return settingMatch ? `Tenant Settings · ${settingMatch.label}` : "Tenant Settings";
    }
    for (const group of NAV_GROUPS) {
      const match = group.items.find(
        (item) => item.href !== "/" && pathname.startsWith(item.href)
      );
      if (match) return match.label;
    }
    return pathname;
  })();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F7F8] text-[#18181B]">
      {/* Left Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-[#E4E4E7] bg-white transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Tenant Header */}
        <div
          className={`border-b border-[#E4E4E7] ${
            sidebarCollapsed ? "px-2.5 py-3.5" : "px-4 py-3.5"
          }`}
        >
          <div
            className={`flex items-center ${
              sidebarCollapsed ? "justify-center" : "justify-between gap-2"
            }`}
          >
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[14px] font-semibold text-[#18181B]">
                    {me?.tenantName ?? "Loading tenant…"}
                  </span>
                  {me?.planName && (
                    <StatusBadge label={me.planName} tone="primary" showDot={false} />
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[#63636B]">
                  <span className="truncate">{me?.tenantSlug ?? "—"}</span>
                  <span>·</span>
                  <span>{me?.baseCurrency ?? "USD"}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#63636B] transition-colors hover:bg-[#F7F7F8] hover:text-[#18181B]"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* ⌘K Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            title="Quick jump (⌘K)"
            className={`mt-3 flex h-9 w-full items-center rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] text-[12px] text-[#63636B] hover:border-[#1D4ED8]/50 hover:text-[#18181B] ${
              sidebarCollapsed ? "justify-center px-0" : "justify-between px-3"
            }`}
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Quick jump…</span>}
            </span>
            {!sidebarCollapsed && (
              <kbd className="rounded border border-[#E4E4E7] bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Feature-Aware Navigation */}
        <nav
          className={`flex-1 overflow-y-auto py-4 ${
            sidebarCollapsed ? "space-y-2 px-2" : "space-y-4 px-3"
          }`}
        >
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.feature && !hasFeature(item.feature)) return false;
              if (item.permission && !hasPermission(item.permission)) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group}>
                {!sidebarCollapsed ? (
                  <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#63636B]">
                    {group.group}
                  </div>
                ) : (
                  <div className="my-1 border-t border-[#F4F4F5]" />
                )}
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
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`flex h-9 items-center rounded-[8px] text-[13px] font-medium transition-colors ${
                          sidebarCollapsed
                            ? "justify-center px-0"
                            : "justify-between px-2.5"
                        } ${
                          active
                            ? "bg-[#EEF2FF] text-[#1D4ED8]"
                            : "text-[#52525B] hover:bg-[#F7F7F8] hover:text-[#18181B]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0" />
                          {!sidebarCollapsed && <span>{item.label}</span>}
                        </span>
                        {!sidebarCollapsed && isTrialOverride && (
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
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-[#E4E4E7] bg-white px-6">
          <div className="text-[14px] font-semibold text-[#18181B]">
            {currentMenuLabel}
          </div>

          <div className="flex items-center gap-2.5">

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 transition-colors hover:bg-[#F7F7F8]"
              >
                <div className="min-w-0 text-right">
                  <div className="truncate text-[13px] font-semibold text-[#18181B]">
                    {me?.fullName ?? "User"}
                  </div>
                  <div className="truncate text-[11px] text-[#63636B]">
                    {me?.tenantName ?? me?.email ?? ""}
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[13px] font-semibold text-[#1D4ED8]">
                  {userInitial}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-[#63636B] transition-transform duration-150 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[14px] border border-[#E4E4E7] bg-white p-2 shadow-lg"
                >
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[14px] font-semibold text-[#1D4ED8]">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-[#18181B]">
                        {me?.fullName ?? "User"}
                      </div>
                      <div className="truncate text-[12px] text-[#63636B]">
                        {me?.email ?? ""}
                      </div>
                    </div>
                  </div>

                  <div className="my-1.5 border-t border-[#E4E4E7]" />

                  {/* Menu Items */}
                  <div className="space-y-0.5">
                    <Link
                      href="/settings/users"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#18181B] transition-colors hover:bg-[#F7F7F8]"
                    >
                      <User className="h-4 w-4 text-[#63636B]" />
                      <span>Personal information</span>
                    </Link>
                    {hasPermission("ADMIN:VIEW") && (
                      <Link
                        href="/settings/organization"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#18181B] transition-colors hover:bg-[#F7F7F8]"
                      >
                        <Settings className="h-4 w-4 text-[#63636B]" />
                        <span>Tenant Settings</span>
                      </Link>
                    )}
                  </div>

                  <div className="my-1.5 border-t border-[#E4E4E7]" />

                  {/* Log out */}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
