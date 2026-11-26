"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Settings,
  User,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusBadge,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@ims/ui";
import { NAV_GROUPS, SETTINGS_NAV } from "@/lib/constants";
import { useEntitlements } from "@/lib/entitlements";
import { useEditMode } from "@/lib/edit-mode";
import { CommandPalette } from "./command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, hasFeature, hasPermission } = useEntitlements();
  const { editMode, canUseEditMode, setEditMode, toggleEditMode } = useEditMode();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    setEditMode(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.info("Signed out");
      router.push("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  }

  function handleToggleEditMode() {
    const next = !editMode;
    toggleEditMode();
    toast.info(next ? "Edit Mode enabled" : "View Only mode enabled", {
      description: next
        ? "Structural edits and deletions are unlocked for this tab."
        : "Structural edits are now locked.",
    });
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Left Sidebar */}
        <aside
          className={`flex shrink-0 flex-col border-r border-border bg-card transition-all duration-200 ${
            sidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          {/* Tenant Header */}
          <div
            className={`border-b border-border ${
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
                    <span className="truncate text-[14px] font-semibold text-foreground">
                      {me?.tenantName ?? "Loading tenant…"}
                    </span>
                    {me?.planName && (
                      <StatusBadge label={me.planName} tone="primary" showDot={false} />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <span className="truncate">{me?.tenantSlug ?? "—"}</span>
                    <span>·</span>
                    <span>{me?.baseCurrency ?? "USD"}</span>
                  </div>
                </div>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSidebarCollapsed((prev) => !prev)}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {sidebarCollapsed ? (
                      <PanelLeftOpen className="h-4 w-4" />
                    ) : (
                      <PanelLeftClose className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* ⌘K Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              title="Quick jump (⌘K)"
              className={`mt-3 flex h-9 w-full items-center rounded-[8px] border border-border bg-background text-[12px] text-muted-foreground hover:border-primary/50 hover:text-foreground ${
                sidebarCollapsed ? "justify-center px-0" : "justify-between px-3"
              }`}
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 shrink-0" />
                {!sidebarCollapsed && <span>Quick jump…</span>}
              </span>
              {!sidebarCollapsed && (
                <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
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
                    <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </div>
                  ) : (
                    <div className="my-1 border-t border-muted" />
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

                      const linkEl = (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex h-9 items-center rounded-[8px] text-[13px] font-medium transition-colors ${
                            sidebarCollapsed
                              ? "justify-center px-0"
                              : "justify-between px-2.5"
                          } ${
                            active
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-background hover:text-foreground"
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

                      return sidebarCollapsed ? (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        linkEl
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
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
            <div className="text-[14px] font-semibold text-foreground">
              {currentMenuLabel}
            </div>

            <div className="flex items-center gap-2.5">
              {canUseEditMode && (
                <button
                  type="button"
                  onClick={handleToggleEditMode}
                  title={
                    editMode
                      ? "Edit Mode is enabled — click to lock structural edits"
                      : "View Only — click to enable Edit Mode"
                  }
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                    editMode
                      ? "border-[var(--status-warning-fg)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] hover:bg-[var(--border-warning)]"
                      : "border-border bg-background text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground"
                  }`}
                >
                  {editMode ? (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit Mode ON</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>View Only</span>
                    </>
                  )}
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 transition-colors hover:bg-background"
                  >
                    <div className="min-w-0 text-right">
                      <div className="truncate text-[13px] font-semibold text-foreground">
                        {me?.fullName ?? "User"}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {me?.tenantName ?? me?.email ?? ""}
                      </div>
                    </div>
                    <Avatar>
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-72 rounded-[14px] p-2">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3 px-2.5 py-2">
                    <Avatar className="size-10">
                      <AvatarFallback className="text-[14px]">{userInitial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-foreground">
                        {me?.fullName ?? "User"}
                      </div>
                      <div className="truncate text-[12px] text-muted-foreground">
                        {me?.email ?? ""}
                      </div>
                    </div>
                    {canUseEditMode && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Edit
                        </span>
                        <Switch
                          checked={editMode}
                          onCheckedChange={handleToggleEditMode}
                          aria-label="Toggle Edit Mode"
                          className="data-[state=checked]:bg-[var(--status-warning-fg)]"
                        />
                      </div>
                    )}
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/settings/users">
                      <User className="text-muted-foreground" />
                      <span>Personal information</span>
                    </Link>
                  </DropdownMenuItem>

                  {hasPermission("ADMIN:VIEW") && (
                    <DropdownMenuItem asChild>
                      <Link href="/settings/organization">
                        <Settings className="text-muted-foreground" />
                        <span>Tenant Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                    <LogOut />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>
    </TooltipProvider>
  );
}
