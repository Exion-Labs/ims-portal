"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  PageResponse,
  PartView,
  SalesOrderLineView,
  SalesOrderView,
  StockItemView,
} from "@ims/api-client";
import { ErrorState, StatTile, StatusBadge, toast, toastApiError } from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { ArrowLeft, CheckCircle2, Package, Plus, Send, Truck, X, XCircle } from "lucide-react";

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

  // Allocate stock
  const [allocLine, setAllocLine] = useState<SalesOrderLineView | null>(null);
  const [availableStock, setAvailableStock] = useState<StockItemView[]>([]);
  const [allocStockId, setAllocStockId] = useState("");
  const [allocShipmentId, setAllocShipmentId] = useState("");
  const [allocQty, setAllocQty] = useState("1");

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

          {canUpdate && isOpen && (
            <div className="flex flex-wrap gap-2">
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
                onClick={() =>
                  runAction(
                    () =>
                      apiFetch(`/api/v1/sales-orders/${soId}/shipments`, {
                        method: "POST",
                        body: JSON.stringify({}),
                      }),
                    "Shipment created"
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
              >
                <Truck className="w-4 h-4" /> New Shipment
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  runAction(
                    () => apiFetch(`/api/v1/sales-orders/${soId}/cancel`, { method: "POST" }),
                    `Sales order ${so.reference} cancelled`,
                    "info"
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}
        </div>

        {actionError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{actionError}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Lines" value={so.lines.length} />
          <StatTile label="Shipments" value={so.shipments.length} />
          <StatTile label="Currency" value={so.currency} />
          <StatTile label="Target Date" value={so.targetDate ?? "—"} />
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
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
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-right">Ordered</th>
                <th className="px-4 py-3 text-right">Allocated</th>
                <th className="px-4 py-3 text-right">Shipped</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {so.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
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
                      {line.salePrice != null ? `${line.salePrice} ${line.salePriceCurrency ?? so.currency}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canUpdate && isOpen && (
                        <button
                          onClick={() => openAllocate(line)}
                          className="px-2.5 py-1 text-xs border rounded-md hover:bg-muted"
                        >
                          Allocate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                      {shp.shipmentDate ? ` · Shipped: ${shp.shipmentDate}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge label={shp.shipped ? "SHIPPED" : "PENDING"} tone={shp.shipped ? "success" : "neutral"} />
                    {canUpdate && !shp.shipped && isOpen && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          runAction(
                            () =>
                              apiFetch(`/api/v1/sales-orders/${soId}/shipments/${shp.id}/complete`, {
                                method: "POST",
                                body: JSON.stringify({}),
                              }),
                            `Shipment ${shp.reference} completed`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
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

        {showAddLine && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Add Sales Order Line</h3>
                <button onClick={() => setShowAddLine(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Salable Part *</label>
                  <select
                    required
                    value={linePartId}
                    onChange={(e) => setLinePartId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select part...</option>
                    {salableParts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ipn ? `${p.ipn} — ` : ""}
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Price</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={linePrice}
                      onChange={(e) => setLinePrice(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddLine(false)} className="px-4 py-2 text-sm border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">
                    Add Line
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {allocLine && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Allocate Stock: {allocLine.partName}</h3>
                <button onClick={() => setAllocLine(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await apiFetch(`/api/v1/sales-orders/${soId}/allocate`, {
                      method: "POST",
                      body: JSON.stringify({
                        lineItemId: allocLine.id,
                        shipmentId: allocShipmentId || null,
                        stockItemId: allocStockId,
                        quantity: Number(allocQty),
                      }),
                    });
                    setAllocLine(null);
                  }, "Stock allocated");
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Shipment</label>
                  <select
                    value={allocShipmentId}
                    onChange={(e) => setAllocShipmentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Unassigned to shipment</option>
                    {so.shipments
                      .filter((s) => !s.shipped)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.reference}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Item *</label>
                  <select
                    required
                    value={allocStockId}
                    onChange={(e) => setAllocStockId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select stock...</option>
                    {availableStock.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.locationPathString ?? "Unassigned"} · Qty: {s.quantity}
                        {s.serialNumber ? ` · SN:${s.serialNumber}` : ""}
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
      </div>
    </FeatureGate>
  );
}
