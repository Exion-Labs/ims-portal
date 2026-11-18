"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";

export default function RegisterTenantPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          tenantSlug,
          adminFullName,
          adminEmail,
          adminPassword,
          baseCurrency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Registration failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Unable to register tenant");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4 py-10">
      <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-8 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#1D4ED8] text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#18181B]">
              Provision New Tenant
            </h1>
            <p className="text-[12px] text-[#63636B]">
              Includes a 30-day evaluation on the Trial plan
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[13px] text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={tenantName}
              onChange={(e) => {
                setTenantName(e.target.value);
                if (!tenantSlug) {
                  setTenantSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                  );
                }
              }}
              placeholder="Apex Precision Systems"
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] font-medium text-[#18181B]">
                Tenant Slug
              </label>
              <input
                type="text"
                required
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="apex-precision"
                className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#18181B]">
                Base Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-2 text-[13px]"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Administrator Name
            </label>
            <input
              type="text"
              required
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              placeholder="Jordan Chen"
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Administrator Email
            </label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="jordan@apex-precision.com"
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="h-9 w-full rounded-[8px] bg-[#1D4ED8] text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
          >
            {busy ? "Provisioning workspace…" : "Create Tenant & Sign In"}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-[#52525B]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#1D4ED8] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
