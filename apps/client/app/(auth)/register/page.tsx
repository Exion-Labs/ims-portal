"use client";

import React from "react";
import Link from "next/link";
import { Boxes } from "lucide-react";

export default function RegisterTenantDisabledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4 py-10">
      <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-8 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#1D4ED8] text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#18181B]">
              Tenant Registration Restricted
            </h1>
            <p className="text-[12px] text-[#63636B]">
              New organizations are provisioned by a Platform Administrator.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-[8px] bg-[#1D4ED8] text-[14px] font-medium text-white hover:bg-[#1E40AF]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
