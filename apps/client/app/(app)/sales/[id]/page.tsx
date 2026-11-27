"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  PageResponse,
  PartView,
  SalesOrderLineView,
  SalesOrderShipmentView,
  SalesOrderView,
  StockItemView,
} from "@ims/api-client";
import {
  Alert,
  AlertDescription,
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
import { ArrowLeft, CheckCircle2, Package, Pencil, Plus, Printer, Send, Trash2, Truck, X, XCircle } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  IN_PROGRESS: "warning",
  SHIPPED: "success",
  CANCELLED: "danger",
};

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const soId = params.id;
  const { hasPermission } = useEntitlements();

  const [so, setSo] = useState<SalesOrderView | null>(null);
  const [salableParts, setSalableParts] = useState<PartView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Add line
  const [showAddLine, setShowAddLine] = useState(false);
  const [linePartId, setLinePartId] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [linePrice, setLinePrice] = useState("");

  // Edit / Delete line
  const [editLine, setEditLine] = useState<SalesOrderLineView | null>(null);
  const [editLineQty, setEditLineQty] = useState("1");
  const [editLinePrice, setEditLinePrice] = useState("");
  const [deleteLineTarget, setDeleteLineTarget] = useState<SalesOrderLineView | null>(null);

  // Shipment create / complete modals
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({ carrier: "", trackingNumber: "", notes: "" });
  const [completeShipmentTarget, setCompleteShipmentTarget] = useState<SalesOrderShipmentView | null>(null);
  const [completeForm, setCompleteForm] = useState({
    trackingNumber: "",
    invoiceNumber: "",
    shipmentDate: new Date().toISOString().slice(0, 10),
  });

  // Allocate stock
  const [allocLine, setAllocLine] = useState<SalesOrderLineView | null>(null);
  const [availableStock, setAvailableStock] = useState<StockItemView[]>([]);
  const [allocStockId, setAllocStockId] = useState("");
  const [allocShipmentId, setAllocShipmentId] = useState("");
  const [allocQty, setAllocQty] = useState("1");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [order, parts] = await Promise.all([
        apiFetch<SalesOrderView>(`/api/v1/sales-orders/${soId}`),
        apiFetch<PageResponse<PartView>>("/api/v1/parts?salable=true&size=200"),
      ]);
      setSo(order);
      setSalableParts(parts.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales order");
    } finally {
      setLoading(false);
    }
  }, [soId]);

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
      setActionError(err instanceof Error ? err.message : "Action failed");
      toastApiError(err, "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function openAllocate(line: SalesOrderLineView) {
    setAllocLine(line);
    setAllocStockId("");
    setAllocShipmentId(so?.shipments.find((s) => !s.shipped)?.id ?? "");
    const rem = Math.max(1, Number(line.quantity) - Number(line.shipped) - Number(line.allocated));
    setAllocQty(String(rem));
    try {
      const res = await apiFetch<PageResponse<StockItemView>>(
        `/api/v1/stock-items?partId=${line.partId}&status=OK&size=100`
      );
      setAvailableStock(res.content.filter((s) => !s.building && Number(s.quantity) > 0));
    } catch {
      setAvailableStock([]);
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading sales order...</div>;
  if (error || !so) return <ErrorState message={error ?? "Sales order not found"} onRetry={loadData} />;

  const canUpdate = hasPermission("ORDER:UPDATE");
  const isOpen = so.status === "PENDING" || so.status === "IN_PROGRESS";
  const orderTotal = so.lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.salePrice ?? 0),
    0
  );

  return (
    <FeatureGate feature="SALES">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/sales" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Sales Orders
            </Link>
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold font-mono">{so.reference}</h1>
              <StatusBadge label={so.status} tone={STATUS_TONE[so.status] ?? "neutral"} />
            </div>
            <p className="text-sm text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{so.customerName}</span>
              {so.customerReference ? ` · Ref: ${so.customerReference}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print / Packing List
            </Button>
            {canUpdate && isOpen && (
              <>
                {so.status === "PENDING" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        () => apiFetch(`/api/v1/sales-orders/${soId}/issue`, { method: "POST" }),
                        `Sales order ${so.reference} issued`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                  >
                    <Send className="w-4 h-4" /> Issue Order
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={() => {
                    setShipmentForm({ carrier: "", trackingNumber: "", notes: "" });
                    setShowCreateShipment(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                >
                  <Truck className="w-4 h-4" /> New Shipment
                </button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmCancelOpen(true)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {actionError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{actionError}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Lines" value={so.lines.length} />
          <StatTile label="Order Total" value={`${orderTotal.toLocaleString()} ${so.currency}`} mono />
          <StatTile label="Shipments" value={so.shipments.length} />
          <StatTile label="Target Date" value={so.targetDate ?? "—"} />
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b flex items-center justify-between sm:px-5 sm:py-4">
            <h2 className="text-base font-semibold">Order Line Items</h2>
            {canUpdate && isOpen && (
              <button
                onClick={() => setShowAddLine(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            )}
          </div>

          {/* Mobile Sales Line Cards */}
          <div className="divide-y md:hidden">
            {so.lines.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No line items yet.
              </div>
            ) : (
              so.lines.map((line) => (
                <div key={line.id} className="space-y-2 p-3.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/parts/${line.partId}`} className="font-medium text-primary hover:underline">
                      {line.partIpn ? `${line.partIpn} · ` : ""}
                      {line.partName}
                    </Link>
                    <span className="shrink-0 font-mono text-xs font-semibold">
                      {line.salePrice != null
                        ? `${(Number(line.quantity) * Number(line.salePrice)).toLocaleString()} ${line.salePriceCurrency ?? so.currency}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>Ord: {line.quantity}</span>
                    <span>Alloc: {line.allocated}</span>
                    <span>Shipped: {line.shipped}</span>
                  </div>
                  {canUpdate && isOpen && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAllocate(line)}
                        className="h-9 flex-1 rounded-md border text-xs font-medium hover:bg-muted"
                      >
                        Allocate Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditLine(line);
                          setEditLineQty(String(line.quantity));
                          setEditLinePrice(line.salePrice != null ? String(line.salePrice) : "");
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-md border px-2.5 text-xs hover:bg-muted"
                        aria-label="Edit line"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {Number(line.allocated) === 0 && Number(line.shipped) === 0 && (
                        <button
                          type="button"
                          onClick={() => setDeleteLineTarget(line)}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                          aria-label="Delete line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-right">Ordered</th>
                <th className="px-4 py-3 text-right">Allocated</th>
                <th className="px-4 py-3 text-right">Shipped</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {so.lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No line items yet.
                  </td>
                </tr>
              ) : (
                so.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">
                      <Link href={`/parts/${line.partId}`} className="font-medium text-primary hover:underline">
                        {line.partIpn ? `${line.partIpn} · ` : ""}
                        {line.partName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{line.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">{line.allocated}</td>
                    <td className="px-4 py-3 text-right font-mono">{line.shipped}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {line.salePrice != null ? `${Number(line.salePrice).toLocaleString()} ${line.salePriceCurrency ?? so.currency}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {line.salePrice != null
                        ? `${(Number(line.quantity) * Number(line.salePrice)).toLocaleString()} ${line.salePriceCurrency ?? so.currency}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canUpdate && isOpen && (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAllocate(line)}
                            className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted"
                          >
                            Allocate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditLine(line);
                              setEditLineQty(String(line.quantity));
                              setEditLinePrice(line.salePrice != null ? String(line.salePrice) : "");
                            }}
                            title="Edit line"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {Number(line.allocated) === 0 && Number(line.shipped) === 0 && (
                            <button
                              type="button"
                              onClick={() => setDeleteLineTarget(line)}
                              title="Delete line"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-base font-semibold">Shipments</h2>
          </div>
          <div className="divide-y">
            {so.shipments.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No shipments created yet.</div>
            ) : (
              so.shipments.map((shp) => (
                <div key={shp.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-mono font-semibold text-sm">{shp.reference}</div>
                    <div className="text-xs text-muted-foreground">
                      {shp.carrier ? `Carrier: ${shp.carrier}` : "No carrier"}
                      {shp.trackingNumber ? ` · Tracking: ${shp.trackingNumber}` : ""}
                      {shp.invoiceNumber ? ` · Invoice: ${shp.invoiceNumber}` : ""}
                      {shp.shipmentDate ? ` · Shipped: ${shp.shipmentDate}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={shp.shipped ? "SHIPPED" : "PENDING"} tone={shp.shipped ? "success" : "neutral"} />
                    {canUpdate && !shp.shipped && isOpen && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          setCompleteForm({
                            trackingNumber: shp.trackingNumber ?? "",
                            invoiceNumber: shp.invoiceNumber ?? "",
                            shipmentDate: shp.shipmentDate ?? new Date().toISOString().slice(0, 10),
                          });
                          setCompleteShipmentTarget(shp);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium print:hidden"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete Shipment
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dialog: Edit Sales Order Line */}
        <Dialog open={editLine !== null} onOpenChange={(open) => !open && setEditLine(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Line · {editLine?.partIpn ?? editLine?.partName}</DialogTitle>
            </DialogHeader>
            {editLine && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await apiFetch(`/api/v1/sales-orders/${soId}/lines/${editLine.id}`, {
                      method: "PUT",
                      body: JSON.stringify({
                        quantity: Number(editLineQty),
                        salePrice: editLinePrice !== "" ? Number(editLinePrice) : null,
                      }),
                    });
                    setEditLine(null);
                  }, "Line item updated");
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="any"
                      min={Math.max(0.0001, Number(editLine.allocated) + Number(editLine.shipped))}
                      required
                      value={editLineQty}
                      onChange={(e) => setEditLineQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit Price ({so.currency})</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={editLinePrice}
                      onChange={(e) => setEditLinePrice(e.target.value)}
                    />
                  </div>
                </div>
                {(Number(editLine.allocated) > 0 || Number(editLine.shipped) > 0) && (
                  <p className="text-xs text-muted-foreground">
                    Minimum quantity is {Number(editLine.allocated) + Number(editLine.shipped)} (already allocated/shipped).
                  </p>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditLine(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Delete Line */}
        <AlertDialog
          open={deleteLineTarget !== null}
          onOpenChange={(open) => !open && setDeleteLineTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete order line?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove{" "}
                <strong className="text-foreground">
                  {deleteLineTarget?.partIpn ?? deleteLineTarget?.partName}
                </strong>{" "}
                from {so.reference}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const target = deleteLineTarget;
                  setDeleteLineTarget(null);
                  if (target) {
                    runAction(
                      () =>
                        apiFetch(`/api/v1/sales-orders/${soId}/lines/${target.id}`, {
                          method: "DELETE",
                        }),
                      "Line item deleted"
                    );
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog: Create Shipment */}
        <Dialog open={showCreateShipment} onOpenChange={setShowCreateShipment}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Shipment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await apiFetch(`/api/v1/sales-orders/${soId}/shipments`, {
                    method: "POST",
                    body: JSON.stringify({
                      carrier: shipmentForm.carrier.trim() || null,
                      trackingNumber: shipmentForm.trackingNumber.trim() || null,
                      notes: shipmentForm.notes.trim() || null,
                    }),
                  });
                  setShowCreateShipment(false);
                }, "Shipment created");
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label>Carrier (Optional)</Label>
                <Input
                  value={shipmentForm.carrier}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, carrier: e.target.value })}
                  placeholder="e.g. DHL, PickMe, Own Van"
                />
              </div>
              <div className="space-y-1">
                <Label>Tracking Number (Optional)</Label>
                <Input
                  value={shipmentForm.trackingNumber}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value })}
                  placeholder="TRK-12345"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Notes (Optional)</Label>
                <Input
                  value={shipmentForm.notes}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateShipment(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  Create Shipment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog: Complete Shipment */}
        <Dialog
          open={completeShipmentTarget !== null}
          onOpenChange={(open) => !open && setCompleteShipmentTarget(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Shipment · {completeShipmentTarget?.reference}</DialogTitle>
            </DialogHeader>
            {completeShipmentTarget && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await apiFetch(
                      `/api/v1/sales-orders/${soId}/shipments/${completeShipmentTarget.id}/complete`,
                      {
                        method: "POST",
                        body: JSON.stringify({
                          trackingNumber: completeForm.trackingNumber.trim() || null,
                          invoiceNumber: completeForm.invoiceNumber.trim() || null,
                          shipmentDate: completeForm.shipmentDate || null,
                        }),
                      }
                    );
                    setCompleteShipmentTarget(null);
                  }, `Shipment ${completeShipmentTarget.reference} completed`);
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Tracking Number</Label>
                  <Input
                    value={completeForm.trackingNumber}
                    onChange={(e) => setCompleteForm({ ...completeForm, trackingNumber: e.target.value })}
                    placeholder="TRK-12345"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Invoice Number</Label>
                    <Input
                      value={completeForm.invoiceNumber}
                      onChange={(e) => setCompleteForm({ ...completeForm, invoiceNumber: e.target.value })}
                      placeholder="INV-0001"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Shipment Date</Label>
                    <Input
                      type="date"
                      value={completeForm.shipmentDate}
                      onChange={(e) => setCompleteForm({ ...completeForm, shipmentDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCompleteShipmentTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    Complete &amp; Ship
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showAddLine} onOpenChange={setShowAddLine}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Sales Order Line</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await apiFetch(`/api/v1/sales-orders/${soId}/lines`, {
                    method: "POST",
                    body: JSON.stringify({
                      partId: linePartId,
                      quantity: Number(lineQty),
                      salePrice: linePrice ? Number(linePrice) : null,
                    }),
                  });
                  setShowAddLine(false);
                }, "Line item added");
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label>Salable Part *</Label>
                <Combobox
                  value={linePartId}
                  onValueChange={(val) => {
                    setLinePartId(val);
                    const selected = salableParts.find((p) => p.id === val);
                    const rawPrice = selected?.metadata?.sellingPrice;
                    if (
                      (typeof rawPrice === "number" && Number.isFinite(rawPrice)) ||
                      (typeof rawPrice === "string" && rawPrice.trim() !== "" && Number.isFinite(Number(rawPrice)))
                    ) {
                      setLinePrice(String(rawPrice));
                    }
                  }}
                  placeholder="Select part…"
                  searchPlaceholder="Search salable parts…"
                  options={salableParts.map((p) => ({
                    value: p.id,
                    label: `${p.ipn ? `${p.ipn} — ` : ""}${p.name}`,
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={linePrice}
                    onChange={(e) => setLinePrice(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddLine(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!linePartId}>
                  Add Line
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(allocLine)} onOpenChange={(open) => !open && setAllocLine(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Allocate Stock: {allocLine?.partName}</DialogTitle>
            </DialogHeader>
            {allocLine && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    let targetShipmentId = allocShipmentId;
                    if (!targetShipmentId) {
                      const createdShipment = await apiFetch<{ id: string }>(
                        `/api/v1/sales-orders/${soId}/shipments`,
                        {
                          method: "POST",
                          body: JSON.stringify({}),
                        }
                      );
                      targetShipmentId = createdShipment.id;
                    }
                    await apiFetch(`/api/v1/sales-orders/${soId}/allocate`, {
                      method: "POST",
                      body: JSON.stringify({
                        lineItemId: allocLine.id,
                        shipmentId: targetShipmentId,
                        stockItemId: allocStockId,
                        quantity: Number(allocQty),
                      }),
                    });
                    setAllocLine(null);
                  }, "Stock allocated");
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Shipment</Label>
                  <Select
                    value={allocShipmentId || "__auto__"}
                    onValueChange={(val) =>
                      setAllocShipmentId(val === "__auto__" ? "" : val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-create new shipment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Auto-create new shipment</SelectItem>
                      {so.shipments
                        .filter((s) => !s.shipped)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.reference}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Stock Item *</Label>
                  <Combobox
                    value={allocStockId}
                    onValueChange={setAllocStockId}
                    placeholder="Select stock…"
                    searchPlaceholder="Search stock lots…"
                    options={availableStock.map((s) => ({
                      value: s.id,
                      label: `${s.locationPathString ?? "Unassigned"} · Qty: ${s.quantity}${s.serialNumber ? ` · SN:${s.serialNumber}` : ""}`,
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

        <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel sales order {so.reference}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the sales order and release unshipped allocations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Order</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  setConfirmCancelOpen(false);
                  runAction(
                    () => apiFetch(`/api/v1/sales-orders/${soId}/cancel`, { method: "POST" }),
                    `Sales order ${so.reference} cancelled`,
                    "info"
                  );
                }}
              >
                Cancel Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </FeatureGate>
  );
}
