import React from "react";
import { EntitlementProvider } from "@/lib/entitlements";
import { AppShell } from "@/components/app-shell";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EntitlementProvider>
      <AppShell>{children}</AppShell>
    </EntitlementProvider>
  );
}
