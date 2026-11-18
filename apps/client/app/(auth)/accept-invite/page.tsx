"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, fullName, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? "Invalid invitation token");
        return;
      }
      router.push("/login");
    } catch (err: any) {
      setError(err.message ?? "Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4">
      <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-8">
        <h1 className="text-[18px] font-semibold text-[#18181B]">Accept Invitation</h1>
        <p className="mt-1 text-[13px] text-[#52525B]">
          Complete your account profile to join your team&apos;s workspace.
        </p>

        {error && (
          <div className="mt-4 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[13px] text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Invitation Token
            </label>
            <input
              type="text"
              required
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Set Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-9 w-full rounded-[8px] bg-[#1D4ED8] text-[13px] font-medium text-white hover:bg-[#1E40AF]"
          >
            {busy ? "Activating…" : "Activate Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-[13px]">
          <Link href="/login" className="text-[#1D4ED8] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
