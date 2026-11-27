"use client";

import React from "react";
import { Menu, Plus, Search } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "@ims/ui";

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
  mobileTopAction?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  hideActionsOnMobile?: boolean;
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
  mobileTopAction,
  primaryAction,
  hideActionsOnMobile = false,
}: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-border bg-card p-3">
      {mobileTopAction && (
        <div className="flex w-full justify-end lg:hidden">{mobileTopAction}</div>
      )}
      {onSearchChange !== undefined && (
        <div className="relative min-w-[140px] flex-1 basis-full sm:basis-44">
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-muted-foreground sm:top-2.5" />
          <Input
            type="text"
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-background pl-9 focus-visible:bg-card"
          />
        </div>
      )}

      {filters && (
        <div className="w-full overflow-x-auto sm:w-auto sm:overflow-visible">
          {filters}
        </div>
      )}

      {(menuItems.length > 0 || secondaryAction || primaryAction) && (
        <div
          className={`ml-auto shrink-0 flex-wrap items-center gap-2 ${
            hideActionsOnMobile ? "hidden lg:flex" : "flex"
          }`}
        >
          {menuItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                  title="Actions"
                >
                  <Menu className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {menuItems.map((item) =>
                  item.href ? (
                    <DropdownMenuItem key={item.key} asChild disabled={item.disabled}>
                      <a href={item.href}>
                        {item.icon}
                        <span>{item.label}</span>
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      key={item.key}
                      disabled={item.disabled}
                      onSelect={() => item.onClick?.()}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {secondaryAction}

          {primaryAction && (
            <Button type="button" onClick={primaryAction.onClick}>
              {primaryAction.icon ?? <Plus className="h-4 w-4" />}
              <span>{primaryAction.label}</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
