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
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  StatTile,
  StatusBadge,
  Textarea,
  toast,
  toastApiError,
} from "@ims/ui";
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
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

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

  async function runAction(
    fn: () => Promise<unknown>,
    successTitle?: string,
    tone: "success" | "info" = "success"
  ) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      if (successTitle) {
        if (tone === "info") toast.info(successTitle);
        else toast.success(successTitle);
      }
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Operation failed");
      toastApiError(err, "Operation failed");
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
    }, "Component allocated");
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
    }, "Build output created");
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
    }, "Build output completed");
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
                  onClick={() =>
                    runAction(
                      () => apiFetch(`/api/v1/builds/${buildId}/start`, { method: "POST" }),
                      `Build ${build.reference} started`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Play className="w-4 h-4" /> Start Build
                </button>
              )}
              <button
                disabled={busy}
                onClick={() =>
                  runAction(
                    () => apiFetch(`/api/v1/builds/${buildId}/auto-allocate`, { method: "POST" }),
                    "FIFO stock auto-allocated"
                  )
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
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmCancelOpen(true)}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </Button>
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
          <div className="px-4 py-3.5 border-b flex items-center justify-between sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold">Required Components (BOM Lines)</h2>
          </div>

          {/* Mobile BOM Component Cards */}
          <div className="divide-y md:hidden">
            {build.lines.map((line) => (
              <div key={line.id} className="space-y-2.5 p-3.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/parts/${line.subPartId}`} className="font-medium text-primary hover:underline">
                      {line.subPartIpn ? `${line.subPartIpn} · ` : ""}
                      {line.subPartName}
                    </Link>
                    {line.reference && (
                      <div className="font-mono text-xs text-muted-foreground">Ref: {line.reference}</div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    Req: <strong className="text-foreground">{line.quantity}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>Allocated: {line.allocated}</span>
                  <span>Consumed: {line.consumed}</span>
                </div>
                {line.allocations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {line.allocations.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 font-mono"
                      >
                        {a.serialNumber ? `SN:${a.serialNumber}` : a.batchCode ? `Batch:${a.batchCode}` : "Lot"} ·{" "}
                        {a.quantity} {a.consumed ? "(Consumed)" : "(Reserved)"}
                      </span>
                    ))}
                  </div>
                )}
                {canUpdate && isEditable && (
                  <button
                    onClick={() => openAllocateModal(line)}
                    className="h-9 w-full rounded-md border text-xs font-medium hover:bg-muted"
                  >
                    Allocate Stock
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
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

        <Dialog open={Boolean(allocLine)} onOpenChange={(open) => !open && setAllocLine(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Allocate Stock: {allocLine?.subPartName}</DialogTitle>
            </DialogHeader>
            {allocLine && (
              <form onSubmit={handleManualAllocate} className="space-y-4">
                <div className="space-y-1">
                  <Label>Stock Item *</Label>
                  <Combobox
                    value={allocStockId}
                    onValueChange={setAllocStockId}
                    placeholder="Select available stock…"
                    searchPlaceholder="Search stock lots…"
                    options={availableStock.map((s) => ({
                      value: s.id,
                      label: `${s.locationPathString ?? "Unassigned"} · Qty: ${s.quantity}${s.serialNumber ? ` · SN: ${s.serialNumber}` : ""}${s.batchCode ? ` · Batch: ${s.batchCode}` : ""}`,
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={allocQty}
                    onChange={(e) => setAllocQty(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAllocLine(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!allocStockId}>
                    Allocate
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showOutputModal} onOpenChange={setShowOutputModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Build Output</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOutput} className="space-y-4">
              <div className="space-y-1">
                <Label>Output Quantity *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={outputQty}
                  onChange={(e) => setOutputQty(e.target.value)}
                />
              </div>
              {build.partTrackable && (
                <div className="space-y-1">
                  <Label>Serial Numbers (comma or newline separated)</Label>
                  <Textarea
                    rows={2}
                    value={outputSerials}
                    onChange={(e) => setOutputSerials(e.target.value)}
                    placeholder="SN-1001, SN-1002"
                    className="font-mono"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Output Location</Label>
                <Combobox
                  value={outputLocationId}
                  onValueChange={setOutputLocationId}
                  placeholder="Default location"
                  searchPlaceholder="Search locations…"
                  options={[
                    { value: "", label: "Default location" },
                    ...locations.map((l) => ({ value: l.id, label: l.path })),
                  ]}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowOutputModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Output</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(completingOutput)}
          onOpenChange={(open) => !open && setCompletingOutput(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Build Output</DialogTitle>
            </DialogHeader>
            {completingOutput && (
              <form onSubmit={handleCompleteOutput} className="space-y-4">
                <p className="text-[13px] text-muted-foreground">
                  Complete{" "}
                  <span className="font-mono font-medium text-foreground">
                    {completingOutput.serialNumber
                      ? `SN: ${completingOutput.serialNumber}`
                      : `Qty ${completingOutput.quantity}`}
                  </span>{" "}
                  and consume allocated components.
                </p>
                <div className="space-y-1">
                  <Label>Destination Location</Label>
                  <Combobox
                    value={completeLocationId}
                    onValueChange={setCompleteLocationId}
                    placeholder="Keep current location"
                    searchPlaceholder="Search locations…"
                    options={[
                      { value: "", label: "Keep current location" },
                      ...locations.map((l) => ({ value: l.id, label: l.path })),
                    ]}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompletingOutput(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Complete &amp; Consume
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel build order {build.reference}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the build order as CANCELLED and release reserved components.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Build</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmCancelOpen(false);
                  runAction(
                    () => apiFetch(`/api/v1/builds/${buildId}/cancel`, { method: "POST" }),
                    `Build ${build.reference} cancelled`,
                    "info"
                  );
                }}
              >
                Cancel Build
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </FeatureGate>
  );
}
