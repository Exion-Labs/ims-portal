import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/bff";
import { EntitlementProvider } from "@/lib/entitlements";
import { EditModeProvider } from "@/lib/edit-mode";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has(ACCESS_COOKIE_NAME) || cookieStore.has(REFRESH_COOKIE_NAME);

  if (!hasSession) {
    redirect("/login");
  }

  return (
    <EntitlementProvider>
      <EditModeProvider>
        <AppShell>{children}</AppShell>
      </EditModeProvider>
    </EntitlementProvider>
  );
}
