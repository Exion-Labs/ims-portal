import type { Metadata } from "next";
import "./globals.css";
import { AppQueryProvider } from "@/lib/entitlements";
import { Toaster } from "@ims/ui";

export const metadata: Metadata = {
  title: "IMS — Multi-Tenant Inventory Management",
  description: "Enterprise multi-tenant inventory, warehouse, purchasing, and manufacturing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppQueryProvider>
          {children}
          <Toaster theme="light" />
        </AppQueryProvider>
      </body>
    </html>
  );
}
