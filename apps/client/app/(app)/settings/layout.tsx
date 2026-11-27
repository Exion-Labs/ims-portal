"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemVisible, SETTINGS_NAV } from "@/lib/constants";
import { useEntitlements } from "@/lib/entitlements";
import { Card } from "@ims/ui";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasFeature, hasPermission } = useEntitlements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
          Tenant Settings
        </h1>
        <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">
          Manage organization preferences, users, RBAC roles, API tokens, reference formats, and audit trails.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <aside className="w-full shrink-0 lg:w-56">
          <Card className="no-scrollbar flex flex-nowrap gap-1 overflow-x-auto p-1.5 lg:flex-col lg:space-y-1 lg:p-2">
            {SETTINGS_NAV.map((item) => {
              if (!isNavItemVisible(item, hasFeature, hasPermission)) {
                return null;
              }
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[8px] px-3 text-[13px] font-medium transition-colors lg:gap-2.5 ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </Card>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
