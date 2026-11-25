"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, SearchResultItem } from "@ims/api-client";
import { Search, CornerDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { QUICK_LINKS } from "@/lib/constants";

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
      className="ims-modal-backdrop items-start pt-24 backdrop-blur-[1px]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-[var(--border-subtle)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any part, stock item, setting, or search notes (pg_trgm)…"
            className="ml-3 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close command palette"
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-canvas)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">
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
                className="flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left hover:bg-[var(--brand-tint)]/70"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                      {item.category}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      {item.title}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">{item.subtitle}</div>
                </div>
                <CornerDownLeft className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
