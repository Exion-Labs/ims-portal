import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="bg-[#F7F7F8] text-[#18181B]">
        <div className="bg-[#6D28D9] px-4 py-1.5 text-center text-[12px] font-medium text-white">
          Platform console · changes here affect customer tenants and are audited
        </div>
        {children}
      </body>
    </html>
  );
}
