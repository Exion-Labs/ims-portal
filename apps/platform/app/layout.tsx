import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@ims/ui";

export const metadata: Metadata = {
  title: "IMS Platform Operator Console",
  description: "SaaS Platform Admin Console for Tenant & Entitlement Management",
};

export default function PlatformRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <div className="ims-platform-banner">
          Platform console · changes here affect customer tenants and are audited
        </div>
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
