"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, Button, Card, Input, Label, toast } from "@ims/ui";

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
        const msg = d.message ?? "Invalid invitation token";
        setError(msg);
        toast.error("Invitation failed", { description: msg });
        return;
      }
      toast.success("Account activated", {
        description: "Please sign in with your new password.",
      });
      router.push("/login");
    } catch (err: any) {
      const msg = err.message ?? "Failed to accept invite";
      setError(msg);
      toast.error("Invitation failed", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-[18px] font-semibold text-foreground">Accept Invitation</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Complete your account profile to join your team&apos;s workspace.
        </p>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="invite-token">Invitation Token</Label>
            <Input
              id="invite-token"
              type="text"
              required
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-name">Full Name</Label>
            <Input
              id="invite-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-password">Set Password</Label>
            <Input
              id="invite-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Activating…" : "Activate Account"}
          </Button>
        </form>

        <div className="mt-4 text-center text-[13px]">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
