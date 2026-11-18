import React from "react";
import { StatusBadge } from "@ims/ui";

export default function PlatformConsoleHome() {
  return (
    <div className="flex min-h-[calc(100vh-32px)]">
      <aside className="w-60 bg-[#111113] p-4 text-white">
        <div className="text-[14px] font-semibold">IMS Platform Admin</div>
        <div className="mt-1 font-mono text-[11px] text-zinc-400">
          /api/platform/v1/**
        </div>
      </aside>
      <main className="flex-1 p-8">
        <StatusBadge label="Phase P · Ready for Platform Console Implementation" tone="violet" />
        <h1 className="mt-3 text-[24px] font-semibold text-[#18181B]">
          Platform Operator Console
        </h1>
        <p className="mt-1 text-[14px] text-[#52525B]">
          Separate Next.js deployment with dark sidebar (`#111113`), violet accent (`#6D28D9`), and isolated `/api/platform/v1/**` security chain.
        </p>
      </main>
    </div>
  );
}
