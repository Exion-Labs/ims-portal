"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@ims/api-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  toastApiError,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { FileText, Plus, Radio, Trash2, Webhook } from "lucide-react";

interface ReportTemplateView {
  id: string;
  name: string;
  entityType: string;
  templateHtml: string;
  pageSize: string;
  enabled: boolean;
}

interface WebhookSubscriptionView {
  id: string;
  name: string;
  targetUrl: string;
  eventTypes: string[];
  enabled: boolean;
  lastStatusCode: number | null;
  failureCount: number;
}

export default function IntegrationsSettingsPage() {
  const { hasFeature, hasPermission } = useEntitlements();

  const [templates, setTemplates] = useState<ReportTemplateView[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscriptionView[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New report template
  const [tplName, setTplName] = useState("");
  const [tplEntity, setTplEntity] = useState("PART");
  const [tplHtml, setTplHtml] = useState("<h1>{{name}}</h1><p>IPN: {{ipn}}</p>");

  // New webhook
  const [hookName, setHookName] = useState("");
  const [hookUrl, setHookUrl] = useState("");

  // SSE status
  const [sseStatus, setSseStatus] = useState<string>("Disconnected");
  const [sseEvents, setSseEvents] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<
    null | { type: "template" | "webhook"; id: string; name: string }
  >(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [tpls, hooks] = await Promise.all([
        hasFeature("CUSTOM_REPORTS") ? apiFetch<ReportTemplateView[]>("/api/v1/reports/templates") : Promise.resolve([]),
        hasFeature("WEBHOOKS") ? apiFetch<WebhookSubscriptionView[]>("/api/v1/webhooks") : Promise.resolve([]),
      ]);
      setTemplates(tpls);
      setWebhooks(hooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integration settings");
    }
  }, [hasFeature]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleConnectSse() {
    setSseStatus("Connecting...");
    try {
      const { ticket } = await apiFetch<{ ticket: string }>("/api/v1/events/ticket", { method: "POST" });
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
      const es = new EventSource(`${baseUrl}/api/v1/events?ticket=${encodeURIComponent(ticket)}`);
      es.addEventListener("connected", (e) => {
        setSseStatus("Connected");
        setSseEvents((prev) => [`connected: ${(e as MessageEvent).data}`, ...prev.slice(0, 9)]);
        toast.success("Connected to live event stream");
      });
      es.onerror = () => {
        setSseStatus("Error / Closed");
        toast.error("Live event stream disconnected");
        es.close();
      };
    } catch (err) {
      setSseStatus(err instanceof Error ? err.message : "Failed to connect");
      toastApiError(err, "Failed to connect live stream");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports, Webhooks &amp; Real-Time Events</h1>
        <p className="text-sm text-muted-foreground">
          Manage custom PDF report templates, HMAC-signed webhooks, and live SSE event streams.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <FeatureGate feature="CUSTOM_REPORTS">
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Custom PDF Report Templates ({templates.length})
          </h2>
          {hasPermission("ADMIN:CREATE") && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiFetch("/api/v1/reports/templates", {
                    method: "POST",
                    body: JSON.stringify({ name: tplName, entityType: tplEntity, templateHtml: tplHtml, pageSize: "A4" }),
                  });
                  const createdName = tplName;
                  setTplName("");
                  toast.success("Report template created", { description: createdName });
                  await loadData();
                } catch (err) {
                  toastApiError(err, "Failed to create report template");
                }
              }}
              className="grid grid-cols-1 md:grid-cols-4 gap-3"
            >
              <input
                required
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Template name"
                className="h-10 rounded-lg border bg-background px-3 py-2 text-base sm:h-9 sm:text-sm"
              />
              <Select value={tplEntity} onValueChange={setTplEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PART">PART</SelectItem>
                  <SelectItem value="PURCHASE_ORDER">PURCHASE_ORDER</SelectItem>
                  <SelectItem value="BUILD_ORDER">BUILD_ORDER</SelectItem>
                  <SelectItem value="SALES_ORDER">SALES_ORDER</SelectItem>
                </SelectContent>
              </Select>
              <input
                required
                value={tplHtml}
                onChange={(e) => setTplHtml(e.target.value)}
                placeholder="Handlebars XHTML"
                className="h-10 rounded-lg border bg-background px-3 py-2 font-mono text-base sm:h-9 sm:text-sm"
              />
              <button type="submit" className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Template
              </button>
            </form>
          )}
          <div className="divide-y">
            {templates.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {t.entityType} · {t.pageSize}
                  </div>
                </div>
                {hasPermission("ADMIN:DELETE") && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "template", id: t.id, name: t.name })}
                    className="text-destructive hover:opacity-80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </FeatureGate>

      <FeatureGate feature="WEBHOOKS">
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" /> Outbound Webhooks ({webhooks.length})
          </h2>
          {hasPermission("ADMIN:CREATE") && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                try {
                  await apiFetch("/api/v1/webhooks", {
                    method: "POST",
                    body: JSON.stringify({ name: hookName, targetUrl: hookUrl, eventTypes: ["*"] }),
                  });
                  const createdName = hookName;
                  setHookName("");
                  setHookUrl("");
                  toast.success("Webhook subscribed", { description: createdName });
                  await loadData();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to create webhook");
                  toastApiError(err, "Failed to create webhook");
                }
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              <input
                required
                value={hookName}
                onChange={(e) => setHookName(e.target.value)}
                placeholder="Webhook name"
                className="h-10 rounded-lg border bg-background px-3 py-2 text-base sm:h-9 sm:text-sm"
              />
              <input
                required
                type="url"
                value={hookUrl}
                onChange={(e) => setHookUrl(e.target.value)}
                placeholder="https://hooks.example.com/ims"
                className="h-10 rounded-lg border bg-background px-3 py-2 font-mono text-base sm:h-9 sm:text-sm"
              />
              <button type="submit" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:h-9">
                <Plus className="w-4 h-4" /> Subscribe
              </button>
            </form>
          )}
          <div className="divide-y">
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{w.name}</div>
                  <div className="break-all font-mono text-xs text-muted-foreground">
                    {w.targetUrl} · Failures: {w.failureCount}
                  </div>
                </div>
                {hasPermission("ADMIN:DELETE") && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "webhook", id: w.id, name: w.name })}
                    className="text-destructive hover:opacity-80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </FeatureGate>

      <FeatureGate feature="REALTIME">
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500" /> Real-Time SSE Stream ({sseStatus})
            </h2>
            <button onClick={handleConnectSse} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
              Connect Live Stream
            </button>
          </div>
          {sseEvents.length > 0 && (
            <div className="bg-muted/40 rounded-lg p-3 font-mono text-xs space-y-1">
              {sseEvents.map((ev, idx) => (
                <div key={idx}>{ev}</div>
              ))}
            </div>
          )}
        </div>
      </FeatureGate>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "template" ? "report template" : "webhook"}{" "}
              {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                const target = deleteTarget;
                setDeleteTarget(null);
                try {
                  if (target.type === "template") {
                    await apiFetch(`/api/v1/reports/templates/${target.id}`, { method: "DELETE" });
                    toast.success("Report template deleted", { description: target.name });
                  } else {
                    await apiFetch(`/api/v1/webhooks/${target.id}`, { method: "DELETE" });
                    toast.success("Webhook deleted", { description: target.name });
                  }
                  await loadData();
                } catch (err) {
                  toastApiError(err, "Delete failed");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
