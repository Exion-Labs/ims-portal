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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-4">
      <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-8">
        <h1 className="text-[18px] font-semibold text-[#18181B]">Reset Password</h1>
        <p className="mt-1 text-[13px] text-[#52525B]">
          Enter your work email and we will send recovery instructions.
        </p>

        {sent ? (
          <div className="mt-4 rounded-[8px] border border-[#BBF7D0] bg-[#DCFCE7]/50 p-4 text-[13px] text-[#166534]">
            If an account exists for <strong>{email}</strong>, a recovery link has been dispatched.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#18181B]">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
              />
            </div>
            <button
              type="submit"
              className="h-9 w-full rounded-[8px] bg-[#1D4ED8] text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-4 text-center text-[13px]">
          <Link href="/login" className="text-[#1D4ED8] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
