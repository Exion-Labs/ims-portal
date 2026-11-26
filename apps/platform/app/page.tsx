"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@ims/ui";

const PLATFORM_API_BASE = "/platform/api/platform/v1";

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  baseCurrency: string;
  planCode: string;
  planName: string;
  userCount: number;
  createdAt: string;
}

interface PlanView {
  id: string;
  code: string;
  name: string;
  description: string;
  features: { featureKey: string; enabled: boolean; limitValue: number | null }[];
}

interface OutboxItem {
  id: string;
  tenantId: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
}

interface PlatformAuditItem {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  occurredAt: string;
}

export default function PlatformConsolePage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("platform@ims.dev");
  const [password, setPassword] = useState("Password123!");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [tab, setTab] = useState<"tenants" | "plans" | "outbox" | "audit">("tenants");
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [plans, setPlans] = useState<PlanView[]>([]);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    tenantName: "",
    tenantSlug: "",
    baseCurrency: "USD",
    planCode: "TRIAL",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const loadAll = useCallback(async () => {
    try {
      const [tRes, pRes, oRes, aRes] = await Promise.all([
        fetch(`${PLATFORM_API_BASE}/tenants`),
        fetch(`${PLATFORM_API_BASE}/plans`),
        fetch(`${PLATFORM_API_BASE}/outbox`),
        fetch(`${PLATFORM_API_BASE}/audit-logs`),
      ]);
      if (tRes.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      setTenants(await tRes.json());
      setPlans(await pRes.json());
      setOutbox(await oRes.json());
      setAuditLogs(await aRes.json());
    } catch {
      // ignore initial check error
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch(`${PLATFORM_API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setLoginError("Invalid platform operator credentials");
        toast.error("Invalid platform operator credentials");
        return;
      }
      setAuthed(true);
      toast.success("Signed in to Platform Console");
      await loadAll();
    } catch {
      setLoginError("Unable to reach platform authentication server");
      toast.error("Unable to reach platform authentication server");
    }
  }

  async function handleRegisterTenant(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError(null);
    setRegistering(true);
    try {
      const res = await fetch(`${PLATFORM_API_BASE}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: tenantForm.tenantName,
          tenantSlug: tenantForm.tenantSlug,
          baseCurrency: tenantForm.baseCurrency,
          planCode: tenantForm.planCode,
          adminFullName: tenantForm.adminFullName,
          adminEmail: tenantForm.adminEmail,
          adminPassword: tenantForm.adminPassword,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message ?? "Failed to register tenant";
        setRegisterError(msg);
        toast.error("Failed to register tenant", { description: msg });
        return;
      }
      setShowRegisterModal(false);
      setTenantForm({
        tenantName: "",
        tenantSlug: "",
        baseCurrency: "USD",
        planCode: "TRIAL",
        adminFullName: "",
        adminEmail: "",
        adminPassword: "",
      });
      setMessage(`Registered tenant ${data.name} (${data.slug})`);
      toast.success("Tenant provisioned", { description: `${data.name} (${data.slug})` });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register tenant";
      setRegisterError(msg);
      toast.error("Failed to register tenant", { description: msg });
    } finally {
      setRegistering(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <Card className="w-full max-w-sm p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <h1 className="text-xl font-bold">IMS Platform Admin Console</h1>
              <p className="text-xs text-muted-foreground">
                Sign in with your operator account (platform@ims.dev).
              </p>
            </div>
            {loginError && (
              <Alert variant="destructive">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">IMS Platform Control Plane</h1>
            <p className="text-xs text-slate-400">Tenants, Plan Entitlements, Support Impersonation &amp; Outbox</p>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              {(["tenants", "plans", "outbox", "audit"] as const).map((t) => (
                <TabsTrigger key={t} value={t} className="uppercase text-xs">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-200 text-xs flex justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)}>Dismiss</button>
          </div>
        )}

        {tab === "tenants" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {tenants.length} registered {tenants.length === 1 ? "tenant" : "tenants"}
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegisterError(null);
                  setShowRegisterModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                + Register Tenant
              </button>
            </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Tenant</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{t.status}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={t.planCode}
                        onValueChange={async (planCode) => {
                          try {
                            const res = await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/plan`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ planCode }),
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              toast.error("Failed to update plan", { description: err.message });
                              return;
                            }
                            setMessage(`Updated ${t.slug} plan to ${planCode}`);
                            toast.success(`Updated ${t.slug} plan to ${planCode}`);
                            await loadAll();
                          } catch {
                            toast.error("Failed to update plan");
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((p) => (
                            <SelectItem key={p.id} value={p.code}>
                              {p.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{t.userCount}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={async () => {
                          const next = t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                          try {
                            const res = await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/status`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: next }),
                            });
                            if (!res.ok) {
                              toast.error("Failed to update tenant status");
                              return;
                            }
                            toast.success(`Tenant ${t.slug} is now ${next}`);
                            await loadAll();
                          } catch {
                            toast.error("Failed to update tenant status");
                          }
                        }}
                        className="px-2.5 py-1 rounded border border-slate-700 text-xs hover:bg-slate-800"
                      >
                        {t.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/usage-snapshots`, { method: "POST" });
                            if (!res.ok) {
                              toast.error("Failed to capture usage snapshot");
                              return;
                            }
                            const snap = await res.json();
                            const msg = `${snap.partsCount} parts, ${snap.locationsCount} locations`;
                            setMessage(`Snapshot for ${t.slug}: ${msg}`);
                            toast.success(`Snapshot for ${t.slug}`, { description: msg });
                          } catch {
                            toast.error("Failed to capture usage snapshot");
                          }
                        }}
                        className="px-2.5 py-1 rounded border border-slate-700 text-xs hover:bg-slate-800"
                      >
                        Snapshot
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/support-sessions`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ reason: "Platform Console support check" }),
                            });
                            if (!res.ok) {
                              toast.error("Failed to start support session");
                              return;
                            }
                            const sess = await res.json();
                            setMessage(`Started support session ${sess.sessionId} for ${t.slug}`);
                            toast.warning("Support session started", {
                              description: `Session ${sess.sessionId} for ${t.slug} (audited)`,
                            });
                            await loadAll();
                          } catch {
                            toast.error("Failed to start support session");
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-amber-600/20 text-amber-300 border border-amber-700/40 text-xs"
                      >
                        Support Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {tab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <div className="font-bold">{p.name} ({p.code})</div>
                  <div className="text-xs text-slate-400">{p.description}</div>
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {p.features.map((f) => (
                    <label key={f.featureKey} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60">
                      <span className="font-mono">{f.featureKey}</span>
                      <Switch
                        checked={f.enabled}
                        onCheckedChange={async (checked) => {
                          try {
                            const res = await fetch(`${PLATFORM_API_BASE}/plans/${p.id}/features/${f.featureKey}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ enabled: checked, limitValue: f.limitValue }),
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              const msg = err.message ?? "Feature dependency conflict";
                              setMessage(msg);
                              toast.error("Feature dependency conflict", { description: msg });
                              return;
                            }
                            toast.success(`Updated ${p.code} · ${f.featureKey}`);
                            await loadAll();
                          } catch {
                            toast.error("Failed to update feature");
                          }
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "outbox" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {outbox.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No pending or failed outbox events.</div>
            ) : (
              outbox.map((ev) => (
                <div key={ev.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-semibold">{ev.eventType} ({ev.status})</div>
                    <div className="text-slate-400">Attempts: {ev.attempts} {ev.lastError ? `· ${ev.lastError}` : ""}</div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${PLATFORM_API_BASE}/outbox/${ev.id}/retry`, { method: "POST" });
                        if (!res.ok) {
                          toast.error("Failed to retry outbox event");
                          return;
                        }
                        toast.success("Outbox retry queued", { description: ev.eventType });
                        await loadAll();
                      } catch {
                        toast.error("Failed to retry outbox event");
                      }
                    }}
                    className="px-3 py-1 rounded bg-blue-600 text-white"
                  >
                    Retry
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-semibold text-blue-300">{log.action}</span>{" "}
                  <span className="text-slate-400">by {log.actorEmail}</span>
                </div>
                <span className="text-slate-500 font-mono">{new Date(log.occurredAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

        <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Register New Tenant</DialogTitle>
            </DialogHeader>

            {registerError && (
              <Alert variant="destructive">
                <AlertDescription>{registerError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRegisterTenant} className="space-y-3">
              <div className="space-y-1">
                <Label>Organization Name *</Label>
                <Input
                  type="text"
                  required
                  value={tenantForm.tenantName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setTenantForm((prev) => ({
                      ...prev,
                      tenantName: name,
                      tenantSlug: prev.tenantSlug
                        ? prev.tenantSlug
                        : name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, ""),
                    }));
                  }}
                  placeholder="Apex Precision Systems"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label>Tenant Slug *</Label>
                  <Input
                    type="text"
                    required
                    value={tenantForm.tenantSlug}
                    onChange={(e) => setTenantForm({ ...tenantForm, tenantSlug: e.target.value })}
                    placeholder="apex-precision"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select
                    value={tenantForm.baseCurrency}
                    onValueChange={(val) => setTenantForm({ ...tenantForm, baseCurrency: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Plan</Label>
                <Select
                  value={tenantForm.planCode}
                  onValueChange={(val) => setTenantForm({ ...tenantForm, planCode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.length === 0 ? (
                      <SelectItem value="TRIAL">TRIAL</SelectItem>
                    ) : (
                      plans.map((p) => (
                        <SelectItem key={p.id} value={p.code}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Administrator Name *</Label>
                <Input
                  type="text"
                  required
                  value={tenantForm.adminFullName}
                  onChange={(e) => setTenantForm({ ...tenantForm, adminFullName: e.target.value })}
                  placeholder="Jordan Chen"
                />
              </div>

              <div className="space-y-1">
                <Label>Administrator Email *</Label>
                <Input
                  type="email"
                  required
                  value={tenantForm.adminEmail}
                  onChange={(e) => setTenantForm({ ...tenantForm, adminEmail: e.target.value })}
                  placeholder="jordan@apex-precision.com"
                />
              </div>

              <div className="space-y-1">
                <Label>Password (min 8 chars) *</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={tenantForm.adminPassword}
                  onChange={(e) => setTenantForm({ ...tenantForm, adminPassword: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={registering}>
                  {registering ? "Provisioning…" : "Register Tenant"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
