"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  LocationView,
  PageResponse,
  ReturnOrderLineView,
  ReturnOrderView,
  StockItemView,
} from "@ims/api-client";
import {
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatTile,
  StatusBadge,
  toast,
  toastApiError,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { ArrowLeft, CheckCircle2, Plus, RotateCcw } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  IN_PROGRESS: "warning",
  COMPLETE: "success",
};

export default function ReturnOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const rmaId = params.id;
  const { hasPermission } = useEntitlements();

  const [rma, setRma] = useState<ReturnOrderView | null>(null);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showAddLine, setShowAddLine] = useState(false);
  const [lineStockId, setLineStockId] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [lineNotes, setLineNotes] = useState("");

  const [receiveTarget, setReceiveTarget] = useState<ReturnOrderLineView | null>(null);
  const [receiveLocId, setReceiveLocId] = useState("");
  const [receiveOutcome, setReceiveOutcome] = useState("QUARANTINED");
  const [receiveNotes, setReceiveNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [order, locs, items] = await Promise.all([
        apiFetch<ReturnOrderView>(`/api/v1/return-orders/${rmaId}`),
        apiFetch<LocationView[]>("/api/v1/stock-locations").catch(() => []),
        apiFetch<PageResponse<StockItemView>>("/api/v1/stock-items?size=200").catch(() => ({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 200,
        })),
      ]);
      setRma(order);
      setLocations(locs);
      setStockItems(items.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load return order");
    } finally {
      setLoading(false);
    }
  }, [rmaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function runAction(fn: () => Promise<unknown>, successTitle: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(successTitle);
      await loadData();
    } catch (err) {
      toastApiError(err, "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading return order...</div>;
  if (error || !rma) return <ErrorState message={error ?? "Return order not found"} onRetry={loadData} />;

  const canUpdate = hasPermission("ORDER:UPDATE");

  return (
    <FeatureGate feature="RETURNS">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/sales?tab=returns"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Returns (RMA)
            </Link>
            <div className="flex items-center gap-3">
              <RotateCcw className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold font-mono">{rma.reference}</h1>
              <StatusBadge label={rma.status} tone={STATUS_TONE[rma.status] ?? "neutral"} />
            </div>
            <p className="text-sm text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{rma.customerName}</span>
              {rma.salesOrderId && (
                <>
                  {" · "}
                  <Link href={`/sales/${rma.salesOrderId}`} className="text-primary hover:underline">
                    View Sales Order →
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatTile label="Lines" value={rma.lines.length} />
          <StatTile label="Target Date" value={rma.targetDate ?? "—"} />
          <StatTile label="Completed" value={rma.completionDate ?? "—"} />
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b flex items-center justify-between sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold">Return Line Items</h2>
            {canUpdate && rma.status !== "COMPLETE" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setLineStockId("");
                  setLineQty("1");
                  setLineNotes("");
                  setShowAddLine(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Return Line
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Part / Lot</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-left">Outcome</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rma.lines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      No return lines yet.
                    </td>
                  </tr>
                ) : (
                  rma.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3">
                        <Link href={`/parts/${line.partId}`} className="font-medium text-primary hover:underline">
                          {line.partIpn ? `${line.partIpn} · ` : ""}
                          {line.partName}
                        </Link>
                        <div className="text-xs font-mono text-muted-foreground">
                          {line.serialNumber ? `SN: ${line.serialNumber}` : line.batchCode ? `Lot: ${line.batchCode}` : "Standard lot"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{line.quantity}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={line.outcome}
                          tone={
                            line.outcome === "OK"
                              ? "success"
                              : line.outcome === "PENDING"
                                ? "neutral"
                                : "warning"
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canUpdate && line.outcome === "PENDING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReceiveTarget(line);
                              setReceiveLocId(locations.find((l) => !l.structural)?.id ?? "");
                              setReceiveOutcome("QUARANTINED");
                              setReceiveNotes("");
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Receive &amp; Disposition
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Return Line */}
        <Dialog open={showAddLine} onOpenChange={setShowAddLine}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Return Line</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await apiFetch(`/api/v1/return-orders/${rmaId}/lines`, {
                    method: "POST",
                    body: JSON.stringify({
                      stockItemId: lineStockId,
                      quantity: Number(lineQty),
                      notes: lineNotes.trim() || null,
                    }),
                  });
                  setShowAddLine(false);
                }, "Return line added");
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label>Stock Item *</Label>
                <Combobox
                  value={lineStockId}
                  onValueChange={setLineStockId}
                  placeholder="Select stock item…"
                  searchPlaceholder="Search part or serial…"
                  options={stockItems.map((s) => ({
                    value: s.id,
                    label: `${s.partIpn} · ${s.partName}${s.serialNumber ? ` (SN:${s.serialNumber})` : ` (Qty:${s.quantity})`}`,
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
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Reason / Notes</Label>
                <Input
                  value={lineNotes}
                  onChange={(e) => setLineNotes(e.target.value)}
                  placeholder="Defective, wrong fitment, etc."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddLine(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !lineStockId}>
                  Add Line
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Receive & Disposition */}
        <Dialog open={receiveTarget !== null} onOpenChange={(open) => !open && setReceiveTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Receive Return · {receiveTarget?.partName}</DialogTitle>
            </DialogHeader>
            {receiveTarget && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await apiFetch(`/api/v1/return-orders/${rmaId}/lines/${receiveTarget.id}/receive`, {
                      method: "POST",
                      body: JSON.stringify({
                        quarantineLocationId: receiveLocId || null,
                        outcome: receiveOutcome,
                        notes: receiveNotes.trim() || null,
                      }),
                    });
                    setReceiveTarget(null);
                  }, "Return received & dispositioned");
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Disposition Outcome *</Label>
                  <Select value={receiveOutcome} onValueChange={setReceiveOutcome}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">OK (Restock as Available)</SelectItem>
                      <SelectItem value="QUARANTINED">QUARANTINED (Hold for Inspection)</SelectItem>
                      <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Receiving Location</Label>
                  <Combobox
                    value={receiveLocId}
                    onValueChange={setReceiveLocId}
                    placeholder="Select bin…"
                    searchPlaceholder="Search locations…"
                    options={locations.map((l) => ({
                      value: l.id,
                      label: `${l.pathString} ${l.structural ? "[Structural]" : ""}`,
                      disabled: l.structural,
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Inspection Notes</Label>
                  <Input
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setReceiveTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    Confirm Disposition
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
