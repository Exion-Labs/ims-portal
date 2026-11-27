"use client";

import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ims/ui";

export const CURRENCY_OPTIONS = [
  { code: "LKR", label: "LKR — Sri Lankan Rupee" },
] as const;

export interface CurrencySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CurrencySelect({ value, onValueChange, className }: CurrencySelectProps) {
  const normalized = (value || "LKR").toUpperCase();
  const hasKnown = CURRENCY_OPTIONS.some((c) => c.code === normalized);
  const selectedValue = hasKnown ? normalized : "LKR";

  return (
    <Select value={selectedValue} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_OPTIONS.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
