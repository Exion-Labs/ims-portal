"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@acme-robotics.dev");
  const [password, setPassword] = useState("Password123!");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Invalid email or password");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Unable to connect to authentication server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4">
      <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-8 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#1D4ED8] text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#18181B]">Sign in to IMS</h1>
            <p className="text-[12px] text-[#63636B]">
              Multi-Tenant Inventory & Manufacturing Console
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
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] text-[#18181B] focus:border-[#1D4ED8] focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-medium text-[#18181B]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-[#1D4ED8] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] text-[#18181B] focus:border-[#1D4ED8] focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="h-9 w-full rounded-[8px] bg-[#1D4ED8] text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] p-3 text-[12px] text-[#52525B]">
          <div className="font-semibold text-[#18181B]">Demo Seeded Accounts (Dev Profile)</div>
          <div className="mt-1 flex flex-col gap-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@acme-robotics.dev");
                setPassword("Password123!");
              }}
              className="text-left text-[#1D4ED8] hover:underline"
            >
              PRO Tenant: admin@acme-robotics.dev / Password123!
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@nordic-labs.dev");
                setPassword("Password123!");
              }}
              className="text-left text-[#1D4ED8] hover:underline"
            >
              STARTER Tenant: admin@nordic-labs.dev / Password123!
            </button>
          </div>
        </div>

        <div className="mt-5 text-center text-[13px] text-[#52525B]">
          New organization?{" "}
          <Link href="/register" className="font-medium text-[#1D4ED8] hover:underline">
            Register a tenant
          </Link>
        </div>
      </div>
    </div>
  );
}
