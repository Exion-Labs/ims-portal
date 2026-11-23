"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_NAV } from "@/lib/constants";
import { useEntitlements } from "@/lib/entitlements";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasFeature } = useEntitlements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
          Tenant Settings
        </h1>
        <p className="mt-0.5 text-[14px] text-[#52525B]">
          Manage organization preferences, users, RBAC roles, API tokens, reference formats, and audit trails.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="space-y-1 rounded-[12px] border border-[#E4E4E7] bg-white p-2">
            {SETTINGS_NAV.map((item) => {
              if (item.feature && !hasFeature(item.feature)) {
                return null;
              }
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[#EEF2FF] text-[#1D4ED8]"
                      : "text-[#52525B] hover:bg-[#F7F7F8] hover:text-[#18181B]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
