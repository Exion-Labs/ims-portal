"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";
import { toast } from "@ims/ui";

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
        const msg = data.message ?? "Invalid email or password";
        setError(msg);
        toast.error("Sign in failed", { description: msg });
        return;
      }
      toast.success("Signed in");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      const msg = err.message ?? "Unable to connect to authentication server";
      setError(msg);
      toast.error("Sign in failed", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
      <div className="ims-auth-card">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Sign in to IMS</h1>
            <p className="text-[12px] text-[var(--text-muted)]">
              Multi-Tenant Inventory & Manufacturing Console
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[8px] border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/60 px-3 py-2 text-[13px] text-[var(--status-danger-fg)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-primary)]">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-medium text-[var(--text-primary)]">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-[var(--brand-primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="h-9 w-full rounded-[8px] bg-[var(--brand-primary)] text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-[12px] text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)]">Demo Seeded Accounts (Dev Profile)</div>
          <div className="mt-1 flex flex-col gap-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@acme-robotics.dev");
                setPassword("Password123!");
                toast.info("Demo credentials filled", { description: "admin@acme-robotics.dev" });
              }}
              className="text-left text-[var(--brand-primary)] hover:underline"
            >
              PRO Tenant: admin@acme-robotics.dev / Password123!
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@nordic-labs.dev");
                setPassword("Password123!");
                toast.info("Demo credentials filled", { description: "admin@nordic-labs.dev" });
              }}
              className="text-left text-[var(--brand-primary)] hover:underline"
            >
              STARTER Tenant: admin@nordic-labs.dev / Password123!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
