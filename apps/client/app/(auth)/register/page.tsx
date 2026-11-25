"use client";

import React from "react";
import Link from "next/link";
import { Boxes } from "lucide-react";

export default function RegisterTenantDisabledPage() {
  return (
    <div className="ims-auth-shell">
      <div className="ims-auth-card">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
              Tenant Registration Restricted
            </h1>
            <p className="text-[12px] text-[var(--text-muted)]">
              New organizations are provisioned by a Platform Administrator.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-[14px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
