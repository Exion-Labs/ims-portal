"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  Cpu,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Settings,
  ShoppingCart,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusBadge,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@ims/ui";
import { isNavItemVisible, NAV_GROUPS, SETTINGS_NAV } from "@/lib/constants";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const mobileBottomTabs = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    ...(hasFeature("PARTS") ? [{ label: "Items", href: "/parts", icon: Cpu }] : []),
    ...(hasFeature("STOCK") ? [{ label: "Stock", href: "/stock", icon: Boxes }] : []),
    ...(hasFeature("SALES")
      ? [{ label: "Sales", href: "/sales", icon: Package }]
      : hasFeature("PURCHASING")
        ? [{ label: "Orders", href: "/purchasing", icon: ShoppingCart }]
        : []),
  ];

  function renderNavGroups(collapsed: boolean, onNavigate?: () => void) {
    return (
      <nav
        className={`flex-1 overflow-y-auto py-4 ${
          collapsed ? "space-y-2 px-2" : "space-y-4 px-3"
        }`}
      >
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            isNavItemVisible(item, hasFeature, hasPermission)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group}>
              {!collapsed ? (
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
                      onClick={onNavigate}
                      className={`flex h-10 items-center rounded-[8px] text-[13px] font-medium transition-colors lg:h-9 ${
                        collapsed
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
                        {!collapsed && <span>{item.label}</span>}
                      </span>
                      {!collapsed && isTrialOverride && (
                        <StatusBadge label="Trial" tone="violet" showDot={false} />
                      )}
                    </Link>
                  );

                  return collapsed ? (
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
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh bg-background text-foreground">
        {/* Desktop Left Sidebar */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-border bg-card transition-all duration-200 lg:flex ${
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

          {renderNavGroups(sidebarCollapsed)}
        </aside>

        {/* Mobile Slide-Out Navigation Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[86vw] max-w-xs gap-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="border-b border-border px-4 py-3.5 pr-12">
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

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCmdOpen(true);
                }}
                className="mt-3 flex h-10 w-full items-center gap-2 rounded-[8px] border border-border bg-background px-3 text-[13px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span>Search parts, orders, settings…</span>
              </button>
            </div>

            {renderNavGroups(false, () => setMobileMenuOpen(false))}
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="shrink-0 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="truncate text-[14px] font-semibold text-foreground">
                {currentMenuLabel}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setCmdOpen(true)}
                aria-label="Quick search"
                className="lg:hidden"
              >
                <Search className="h-4 w-4" />
              </Button>

              {canUseEditMode && (
                <span
                  title={
                    editMode
                      ? "Edit Mode is enabled — toggle in your profile menu"
                      : "View Only — toggle Edit Mode in your profile menu"
                  }
                  className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium sm:px-3 ${
                    editMode
                      ? "border-[var(--status-warning-fg)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {editMode ? (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Edit Mode ON</span>
                      <span className="sm:hidden">Edit</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">View Only</span>
                      <span className="sm:hidden">View</span>
                    </>
                  )}
                </span>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-[10px] px-1.5 py-1.5 transition-colors hover:bg-background sm:gap-2.5 sm:px-2.5"
                  >
                    <div className="hidden min-w-0 text-right sm:block">
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
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
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

          <main className="min-w-0 flex-1 p-3 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-flow-col auto-cols-fr border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {mobileBottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
              mobileMenuOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Menu className="h-4 w-4" />
            <span>More</span>
          </button>
        </nav>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      </div>
    </TooltipProvider>
  );
}
