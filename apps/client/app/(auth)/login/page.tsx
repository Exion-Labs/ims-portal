"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";
import { Alert, AlertDescription, Button, Card, Input, Label, toast } from "@ims/ui";

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
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-6 sm:py-10">
      <Card className="w-full max-w-md p-5 shadow-xs sm:p-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-foreground">Sign in to IMS</h1>
            <p className="text-[12px] text-muted-foreground">
              Multi-Tenant Inventory &amp; Manufacturing Console
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="login-email">Work Email</Label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 rounded-[8px] border border-border bg-background p-3 text-[12px] text-muted-foreground">
          <div className="font-semibold text-foreground">Demo Seeded Accounts (Dev Profile)</div>
          <div className="mt-1 flex flex-col gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@acme-robotics.dev");
                setPassword("Password123!");
                toast.info("Demo credentials filled", { description: "admin@acme-robotics.dev" });
              }}
              className="break-all text-left text-primary hover:underline"
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
              className="break-all text-left text-primary hover:underline"
            >
              STARTER Tenant: admin@nordic-labs.dev / Password123!
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
