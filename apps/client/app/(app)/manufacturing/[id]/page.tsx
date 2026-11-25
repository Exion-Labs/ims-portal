"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  BuildLineView,
  BuildOrderView,
  LocationView,
  PageResponse,
  StockItemView,
} from "@ims/api-client";
import { ErrorState, StatTile, StatusBadge } from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import {
  ArrowLeft,
  CheckCircle2,
  Factory,
  Layers,
  PackagePlus,
  Play,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  PRODUCTION: "warning",
  COMPLETE: "success",
  CANCELLED: "danger",
};

export default function BuildOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const buildId = params.id;
  const { hasPermission } = useEntitlements();

  const [build, setBuild] = useState<BuildOrderView | null>(null);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [inProductionOutputs, setInProductionOutputs] = useState<StockItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Manual allocation modal
  const [allocLine, setAllocLine] = useState<BuildLineView | null>(null);
  const [availableStock, setAvailableStock] = useState<StockItemView[]>([]);
  const [allocStockId, setAllocStockId] = useState("");
  const [allocQty, setAllocQty] = useState("");

  // Create output modal
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [outputQty, setOutputQty] = useState("1");
  const [outputSerials, setOutputSerials] = useState("");
  const [outputLocationId, setOutputLocationId] = useState("");

  // Complete output modal
  const [completingOutput, setCompletingOutput] = useState<StockItemView | null>(null);
  const [completeLocationId, setCompleteLocationId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, locs] = await Promise.all([
        apiFetch<BuildOrderView>(`/api/v1/builds/${buildId}`),
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
      ]);
      setBuild(b);
      setLocations(locs);
      setOutputLocationId(b.destinationLocationId ?? "");
      setCompleteLocationId(b.destinationLocationId ?? "");

      const stockRes = await apiFetch<PageResponse<StockItemView>>(
        `/api/v1/stock-items?partId=${b.partId}&size=100`
      );
      setInProductionOutputs(stockRes.content.filter((s) => s.building));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load build order");
    } finally {
      setLoading(false);
    }
  }, [buildId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function openAllocateModal(line: BuildLineView) {
    setAllocLine(line);
    setAllocStockId("");
    const remaining = Math.max(0, Number(line.quantity) - Number(line.allocated));
    setAllocQty(String(remaining > 0 ? remaining : line.quantity));
    try {
      const res = await apiFetch<PageResponse<StockItemView>>(
        `/api/v1/stock-items?partId=${line.subPartId}&status=OK&size=100`
      );
      setAvailableStock(res.content.filter((s) => !s.building && Number(s.quantity) > 0));
    } catch {
      setAvailableStock([]);
    }
  }

  async function handleManualAllocate(e: React.FormEvent) {
    e.preventDefault();
    if (!allocLine) return;
    await runAction(async () => {
      await apiFetch(`/api/v1/builds/${buildId}/allocate`, {
        method: "POST",
        body: JSON.stringify({
          buildLineId: allocLine.id,
          stockItemId: allocStockId,
          quantity: Number(allocQty),
        }),
      });
      setAllocLine(null);
    });
  }

  async function handleCreateOutput(e: React.FormEvent) {
    e.preventDefault();
    const serialNumbers = outputSerials
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await runAction(async () => {
      await apiFetch(`/api/v1/builds/${buildId}/outputs`, {
        method: "POST",
        body: JSON.stringify({
          quantity: Number(outputQty),
          serialNumbers: serialNumbers.length > 0 ? serialNumbers : null,
          locationId: outputLocationId || null,
        }),
      });
      setShowOutputModal(false);
      setOutputSerials("");
    });
  }

  async function handleCompleteOutput(e: React.FormEvent) {
    e.preventDefault();
    if (!completingOutput) return;
    await runAction(async () => {
      await apiFetch(`/api/v1/builds/${buildId}/complete-output`, {
        method: "POST",
        body: JSON.stringify({
          outputStockItemId: completingOutput.id,
          destinationLocationId: completeLocationId || null,
          status: "OK",
        }),
      });
      setCompletingOutput(null);
    });
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading build order...</div>;
  if (error || !build) return <ErrorState message={error ?? "Build order not found"} onRetry={loadData} />;

  const canUpdate = hasPermission("BUILD:UPDATE");
  const isEditable = build.status === "PENDING" || build.status === "PRODUCTION";

  return (
    <FeatureGate feature="MANUFACTURING">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/manufacturing"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Manufacturing
            </Link>
            <div className="flex items-center gap-3">
              <Factory className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold font-mono">{build.reference}</h1>
              <StatusBadge label={build.status} tone={STATUS_TONE[build.status] ?? "neutral"} />
            </div>
            <p className="text-sm text-muted-foreground">
              {build.title} · Assembly:{" "}
              <Link href={`/parts/${build.partId}`} className="text-primary hover:underline font-medium">
                {build.partIpn ? `${build.partIpn} · ` : ""}
                {build.partName}
              </Link>
            </p>
          </div>

          {canUpdate && isEditable && (
            <div className="flex flex-wrap items-center gap-2">
              {build.status === "PENDING" && (
                <button
                  disabled={busy}
                  onClick={() => runAction(() => apiFetch(`/api/v1/builds/${buildId}/start`, { method: "POST" }))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Play className="w-4 h-4" /> Start Build
                </button>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  runAction(() => apiFetch(`/api/v1/builds/${buildId}/auto-allocate`, { method: "POST" }))
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
              >
                <Sparkles className="w-4 h-4" /> Auto-Allocate FIFO
              </button>
              {build.status === "PRODUCTION" && (
                <button
                  disabled={busy}
                  onClick={() => setShowOutputModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  <PackagePlus className="w-4 h-4" /> Create Build Output
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => runAction(() => apiFetch(`/api/v1/builds/${buildId}/cancel`, { method: "POST" }))}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}
        </div>

        {actionError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{actionError}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Target Quantity" value={`${build.quantity} ${build.partUnit ?? ""}`} />
          <StatTile label="Completed" value={`${build.completed} ${build.partUnit ?? ""}`} />
          <StatTile label="BOM Lines" value={build.lines.length} />
          <StatTile label="Destination" value={build.destinationLocationPath ?? "Unassigned"} />
        </div>

        {inProductionOutputs.length > 0 && (
          <div className="bg-card border rounded-xl p-5 space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" /> In-Production Build Outputs
            </h2>
            <div className="divide-y">
              {inProductionOutputs.map((out) => (
                <div key={out.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-sm font-medium">
                      {out.serialNumber ? `SN: ${out.serialNumber}` : `Qty: ${out.quantity}`}{" "}
                      <span className="text-muted-foreground text-xs">({out.locationPathString ?? "No location"})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Status: Building in progress</div>
                  </div>
                  {canUpdate && (
                    <button
                      onClick={() => setCompletingOutput(out)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete Output
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-base font-semibold">Required Components (BOM Lines)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Component</th>
                  <th className="px-4 py-3 text-left">Ref</th>
                  <th className="px-4 py-3 text-right">Required</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Consumed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {build.lines.map((line) => (
                  <React.Fragment key={line.id}>
                    <tr className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/parts/${line.subPartId}`} className="font-medium text-primary hover:underline">
                          {line.subPartIpn ? `${line.subPartIpn} · ` : ""}
                          {line.subPartName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{line.reference ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{line.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{line.allocated}</td>
                      <td className="px-4 py-3 text-right font-mono">{line.consumed}</td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && isEditable && (
                          <button
                            onClick={() => openAllocateModal(line)}
                            className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted"
                          >
                            Allocate Stock
                          </button>
                        )}
                      </td>
                    </tr>
                    {line.allocations.length > 0 && (
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-6 py-2">
                          <div className="flex flex-wrap gap-2 text-xs">
                            {line.allocations.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-background border font-mono"
                              >
                                {a.serialNumber ? `SN:${a.serialNumber}` : a.batchCode ? `Batch:${a.batchCode}` : "Lot"} ·{" "}
                                {a.quantity} {a.consumed ? "(Consumed)" : "(Reserved)"}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {allocLine && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Allocate Stock: {allocLine.subPartName}</h3>
                <button onClick={() => setAllocLine(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleManualAllocate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Item *</label>
                  <select
                    required
                    value={allocStockId}
                    onChange={(e) => setAllocStockId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select available stock...</option>
                    {availableStock.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.locationPathString ?? "Unassigned"} · Qty: {s.quantity}
                        {s.serialNumber ? ` · SN: ${s.serialNumber}` : ""}
                        {s.batchCode ? ` · Batch: ${s.batchCode}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={allocQty}
                    onChange={(e) => setAllocQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAllocLine(null)} className="px-4 py-2 text-sm border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">
                    Allocate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showOutputModal && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Create Build Output</h3>
                <button onClick={() => setShowOutputModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateOutput} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Output Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={outputQty}
                    onChange={(e) => setOutputQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                </div>
                {build.partTrackable && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Serial Numbers (comma or newline separated)
                    </label>
                    <textarea
                      rows={2}
                      value={outputSerials}
                      onChange={(e) => setOutputSerials(e.target.value)}
                      placeholder="SN-1001, SN-1002"
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Output Location</label>
                  <select
                    value={outputLocationId}
                    onChange={(e) => setOutputLocationId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Default location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOutputModal(false)}
                    className="px-4 py-2 text-sm border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">
                    Create Output
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {completingOutput && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Complete Build Output</h3>
                <button onClick={() => setCompletingOutput(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCompleteOutput} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Complete{" "}
                  <span className="font-mono font-medium text-foreground">
                    {completingOutput.serialNumber
                      ? `SN: ${completingOutput.serialNumber}`
                      : `Qty ${completingOutput.quantity}`}
                  </span>{" "}
                  and consume allocated components.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Destination Location</label>
                  <select
                    value={completeLocationId}
                    onChange={(e) => setCompleteLocationId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Keep current location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCompletingOutput(null)}
                    className="px-4 py-2 text-sm border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white">
                    Complete &amp; Consume
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
