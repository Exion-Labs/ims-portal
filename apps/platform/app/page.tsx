"use client";

import React, { useCallback, useEffect, useState } from "react";

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
    const res = await fetch(`${PLATFORM_API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setLoginError("Invalid platform operator credentials");
      return;
    }
    setAuthed(true);
    await loadAll();
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold">IMS Platform Admin Console</h1>
          <p className="text-xs text-slate-400">Sign in with your operator account (platform@ims.dev).</p>
          {loginError && <div className="p-2.5 rounded bg-red-950/60 text-red-300 text-xs">{loginError}</div>}
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm"
            />
          </div>
          <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold">
            Sign In
          </button>
        </form>
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
          <div className="flex gap-2">
            {(["tenants", "plans", "outbox", "audit"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase ${
                  tab === t ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-200 text-xs flex justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)}>Dismiss</button>
          </div>
        )}

        {tab === "tenants" && (
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
                      <select
                        value={t.planCode}
                        onChange={async (e) => {
                          await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/plan`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ planCode: e.target.value }),
                          });
                          setMessage(`Updated ${t.slug} plan to ${e.target.value}`);
                          await loadAll();
                        }}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.code}>
                            {p.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{t.userCount}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={async () => {
                          const next = t.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                          await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/status`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: next }),
                          });
                          await loadAll();
                        }}
                        className="px-2.5 py-1 rounded border border-slate-700 text-xs hover:bg-slate-800"
                      >
                        {t.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/usage-snapshots`, { method: "POST" });
                          const snap = await res.json();
                          setMessage(`Snapshot for ${t.slug}: ${snap.partsCount} parts, ${snap.locationsCount} locations`);
                        }}
                        className="px-2.5 py-1 rounded border border-slate-700 text-xs hover:bg-slate-800"
                      >
                        Snapshot
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`${PLATFORM_API_BASE}/tenants/${t.id}/support-sessions`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reason: "Platform Console support check" }),
                          });
                          const sess = await res.json();
                          setMessage(`Started support session ${sess.sessionId} for ${t.slug}`);
                          await loadAll();
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
                      <input
                        type="checkbox"
                        checked={f.enabled}
                        onChange={async (e) => {
                          const res = await fetch(`${PLATFORM_API_BASE}/plans/${p.id}/features/${f.featureKey}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ enabled: e.target.checked, limitValue: f.limitValue }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            setMessage(err.message ?? "Feature dependency conflict");
                            return;
                          }
                          await loadAll();
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
                      await fetch(`${PLATFORM_API_BASE}/outbox/${ev.id}/retry`, { method: "POST" });
                      await loadAll();
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
    </div>
  );
}
