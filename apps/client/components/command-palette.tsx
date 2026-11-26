"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, SearchResultItem } from "@ims/api-client";
import {
  Badge,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ims/ui";
import { CornerDownLeft } from "lucide-react";
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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Quick Jump">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Jump to any part, stock item, setting, or search notes (pg_trgm)…"
      />
      <CommandList>
        <CommandEmpty>No matching records or pages found.</CommandEmpty>
        {remoteResults.length > 0 && (
          <CommandGroup heading="Search Results">
            {remoteResults.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.category} ${item.title} ${item.subtitle}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
                className="justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded px-1.5 py-0 text-[11px]">
                      {item.category}
                    </Badge>
                    <span className="font-medium text-foreground">{item.title}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{item.subtitle}</div>
                </div>
                <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Quick Links">
          {QUICK_LINKS.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.category} ${item.title} ${item.subtitle}`}
              onSelect={() => {
                onOpenChange(false);
                router.push(item.href);
              }}
              className="justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded px-1.5 py-0 text-[11px]">
                    {item.category}
                  </Badge>
                  <span className="font-medium text-foreground">{item.title}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{item.subtitle}</div>
              </div>
              <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
