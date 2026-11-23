"use client";

import React, { useEffect, useRef, useState } from "react";
import { Menu, Plus, Search } from "lucide-react";

export interface ListToolbarMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

interface ListToolbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  menuItems?: ListToolbarMenuItem[];
  secondaryAction?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

/**
 * Shared list-page toolbar with search input, inline filters, overflow menu, and right-aligned primary action.
 */
export function ListToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  menuItems = [],
  secondaryAction,
  primaryAction,
}: ListToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#E4E4E7] bg-white p-4">
      {onSearchChange !== undefined && (
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#63636B]" />
          <input
            type="text"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] pr-3 pl-9 text-[13px] text-[#18181B] placeholder:text-[#63636B] focus:border-[#1D4ED8] focus:bg-white focus:outline-hidden"
          />
        </div>
      )}

      {filters}

      {(menuItems.length > 0 || secondaryAction || primaryAction) && (
        <div className="ml-auto flex items-center gap-2">
          {menuItems.length > 0 && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="More actions"
                title="Actions"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F7F7F8] hover:text-[#18181B]"
              >
                <Menu className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-1.5 w-52 rounded-[10px] border border-[#E4E4E7] bg-white p-1.5 shadow-lg"
                >
                  {menuItems.map((item) =>
                    item.href ? (
                      <a
                        key={item.key}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </a>
                    ) : (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick?.();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8] disabled:opacity-50"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {secondaryAction}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-3.5 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              {primaryAction.icon ?? <Plus className="h-4 w-4" />}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
