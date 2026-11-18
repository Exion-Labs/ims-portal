"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, SearchResultItem } from "@ims/api-client";
import { Search, CornerDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";

const QUICK_LINKS: SearchResultItem[] = [
  {
    category: "Navigation",
    id: "nav-dashboard",
    title: "Overview Dashboard",
    subtitle: "Tenant summary, KPIs, and quick actions",
    href: "/",
  },
  {
    category: "Settings",
    id: "nav-org",
    title: "Organization Settings",
    subtitle: "Name, base currency, timezone, and preferences",
    href: "/settings/organization",
  },
  {
    category: "Settings",
    id: "nav-users",
    title: "Users & Invitations",
    subtitle: "Manage tenant users and role assignments",
    href: "/settings/users",
  },
  {
    category: "Settings",
    id: "nav-roles",
    title: "Roles & Permissions",
    subtitle: "Configure granular RBAC permissions",
    href: "/settings/roles",
  },
  {
    category: "Settings",
    id: "nav-tokens",
    title: "API Tokens",
    subtitle: "Programmatic REST API personal access tokens",
    href: "/settings/api-tokens",
  },
  {
    category: "Settings",
    id: "nav-sequences",
    title: "Reference Sequences",
    subtitle: "PO-0001, BO-0001, SO-0001 numbering formats",
    href: "/settings/sequences",
  },
  {
    category: "Settings",
    id: "nav-audit",
    title: "Audit Log",
    subtitle: "Immutable field-level before/after audit trail",
    href: "/settings/audit-log",
  },
  {
    category: "Settings",
    id: "nav-plan",
    title: "Plan & Features",
    subtitle: "Active subscription plan, feature entitlements, and usage quotas",
    href: "/settings/plan",
  },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setRemoteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<SearchResultItem[]>(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}`
        );
        setRemoteResults(res);
      } catch {
        setRemoteResults([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  const filteredLinks = QUICK_LINKS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
  );
  const allItems = [...remoteResults, ...filteredLinks];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24 backdrop-blur-[1px]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[12px] border border-[#E4E4E7] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-[#E4E4E7] px-4 py-3">
          <Search className="h-4 w-4 text-[#63636B]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any part, stock item, setting, or search notes (pg_trgm)…"
            className="ml-3 flex-1 bg-transparent text-[14px] text-[#18181B] placeholder:text-[#63636B] focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close command palette"
            className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#63636B]">
              No matching records or pages found.
            </div>
          ) : (
            allItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
                className="flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left hover:bg-[#EEF2FF]/70"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[11px] font-medium text-[#52525B]">
                      {item.category}
                    </span>
                    <span className="text-[13px] font-medium text-[#18181B]">
                      {item.title}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#63636B]">{item.subtitle}</div>
                </div>
                <CornerDownLeft className="h-3.5 w-3.5 text-[#63636B]" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
