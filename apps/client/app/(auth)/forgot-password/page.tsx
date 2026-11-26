"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, Button, Card, Input, Label, toast } from "@ims/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error("Failed to request password reset", { description: d.message });
        return;
      }
      setSent(true);
      toast.success("Recovery link requested", { description: email });
    } catch (err) {
      toast.error("Failed to request password reset", {
        description: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-md p-5 sm:p-8">
        <h1 className="text-[18px] font-semibold text-foreground">Reset Password</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Enter your work email and we will send recovery instructions.
        </p>

        {sent ? (
          <Alert variant="success" className="mt-4">
            <AlertDescription>
              If an account exists for <strong>{email}</strong>, a recovery link has been dispatched.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="forgot-email">Work Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
        )}

        <div className="mt-4 text-center text-[13px]">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
