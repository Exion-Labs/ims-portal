"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4">
      <div className="w-full max-w-md rounded-[12px] border border-[var(--border-subtle)] bg-white p-8">
        <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Reset Password</h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Enter your work email and we will send recovery instructions.
        </p>

        {sent ? (
          <div className="mt-4 rounded-[8px] border border-[var(--border-success)] bg-[var(--status-success-bg)]/50 p-4 text-[13px] text-[var(--status-success-fg)]">
            If an account exists for <strong>{email}</strong>, a recovery link has been dispatched.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-primary)]">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-9 w-full rounded-[8px] border border-[var(--border-subtle)] px-3 text-[13px]"
              />
            </div>
            <button
              type="submit"
              className="h-9 w-full rounded-[8px] bg-[var(--brand-primary)] text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-[13px]">
          <Link href="/login" className="text-[var(--brand-primary)] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
