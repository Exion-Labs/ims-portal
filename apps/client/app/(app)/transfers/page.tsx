"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  apiFetch,
  CompanyView,
  LocationView,
  PageResponse,
  ReturnOrderView,
  StockItemView,
  TransferOrderView,
} from "@ims/api-client";
import { EmptyState, ErrorState, StatusBadge } from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { ArrowLeftRight, Plus, RotateCcw, Truck, X } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  IN_TRANSIT: "warning",
  IN_PROGRESS: "warning",
  COMPLETE: "success",
  CANCELLED: "danger",
};

export default function TransfersAndReturnsPage() {
  const { hasFeature, hasPermission } = useEntitlements();
  const [tab, setTab] = useState<"transfers" | "returns">("transfers");

  const [transfers, setTransfers] = useState<TransferOrderView[]>([]);
  const [returns, setReturns] = useState<ReturnOrderView[]>([]);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [customers, setCustomers] = useState<CompanyView[]>([]);
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Transfer modal
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const [trfForm, setTrfForm] = useState({
    sourceLocationId: "",
    destinationLocationId: "",
    stockItemId: "",
    quantity: "1",
    description: "",
  });

  // Create Return modal
  const [showCreateReturn, setShowCreateReturn] = useState(false);
  const [rmaForm, setRmaForm] = useState({
    customerId: "",
    stockItemId: "",
    description: "",
  });

  // Receive Return modal
  const [receivingRma, setReceivingRma] = useState<{ rmaId: string; lineId: string } | null>(null);
  const [receiveLocId, setReceiveLocId] = useState("");
  const [receiveOutcome, setReceiveOutcome] = useState("RESTOCK");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trfs, rmas, locs, comps, stocks] = await Promise.all([
        hasFeature("TRANSFERS")
          ? apiFetch<PageResponse<TransferOrderView>>("/api/v1/transfer-orders?size=50").then((r) => r.content)
          : Promise.resolve([]),
        hasFeature("RETURNS")
          ? apiFetch<PageResponse<ReturnOrderView>>("/api/v1/return-orders?size=50").then((r) => r.content)
          : Promise.resolve([]),
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
        apiFetch<PageResponse<CompanyView>>("/api/v1/companies?customer=true&size=200").then((r) => r.content),
        apiFetch<PageResponse<StockItemView>>("/api/v1/stock-items?size=100").then((r) => r.content),
      ]);
      setTransfers(trfs);
      setReturns(rmas);
      setLocations(locs);
      setCustomers(comps);
      setStockItems(stocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfers and returns");
    } finally {
      setLoading(false);
    }
  }, [hasFeature]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const created = await apiFetch<TransferOrderView>("/api/v1/transfer-orders", {
        method: "POST",
        body: JSON.stringify({
          sourceLocationId: trfForm.sourceLocationId,
          destinationLocationId: trfForm.destinationLocationId,
          description: trfForm.description || null,
        }),
      });
      if (trfForm.stockItemId) {
        await apiFetch(`/api/v1/transfer-orders/${created.id}/lines`, {
          method: "POST",
          body: JSON.stringify({
            stockItemId: trfForm.stockItemId,
            quantity: Number(trfForm.quantity),
          }),
        });
      }
      setShowCreateTransfer(false);
    });
  }

  async function handleCreateReturn(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const created = await apiFetch<ReturnOrderView>("/api/v1/return-orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: rmaForm.customerId,
          description: rmaForm.description || null,
        }),
      });
      if (rmaForm.stockItemId) {
        await apiFetch(`/api/v1/return-orders/${created.id}/lines`, {
          method: "POST",
          body: JSON.stringify({ stockItemId: rmaForm.stockItemId }),
        });
      }
      setShowCreateReturn(false);
    });
  }

  return (
    <FeatureGate feature="TRANSFERS">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              Transfers &amp; Return Orders (RMA)
            </h1>
            <p className="text-sm text-muted-foreground">
              Inter-warehouse stock transfers and customer return merchandise authorizations.
            </p>
          </div>
          {hasPermission("ORDER:CREATE") && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateTransfer(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New Transfer
              </button>
              {hasFeature("RETURNS") && (
                <button
                  onClick={() => setShowCreateReturn(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                >
                  <RotateCcw className="w-4 h-4" /> New RMA
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-b">
          <button
            onClick={() => setTab("transfers")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              tab === "transfers" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 inline mr-1.5" />
            Transfer Orders ({transfers.length})
          </button>
          {hasFeature("RETURNS") && (
            <button
              onClick={() => setTab("returns")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                tab === "returns" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              <RotateCcw className="w-4 h-4 inline mr-1.5" />
              Return Orders ({returns.length})
            </button>
          )}
        </div>

        {actionError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{actionError}</div>}

        {error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading...</div>
        ) : tab === "transfers" ? (
          transfers.length === 0 ? (
            <EmptyState title="No transfer orders" description="Create a transfer order to move stock between bins." />
          ) : (
            <div className="bg-card border rounded-xl divide-y">
              {transfers.map((trf) => (
                <div key={trf.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{trf.reference}</span>
                      <StatusBadge label={trf.status} tone={STATUS_TONE[trf.status] ?? "neutral"} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trf.sourceLocationPath} → {trf.destinationLocationPath}
                      {trf.description ? ` · ${trf.description}` : ""}
                    </div>
                  </div>
                  {hasPermission("ORDER:UPDATE") && (
                    <div className="flex gap-2">
                      {trf.status === "PENDING" && (
                        <button
                          onClick={() =>
                            runAction(() => apiFetch(`/api/v1/transfer-orders/${trf.id}/dispatch`, { method: "POST" }))
                          }
                          className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted font-medium"
                        >
                          Dispatch
                        </button>
                      )}
                      {(trf.status === "PENDING" || trf.status === "IN_TRANSIT") && (
                        <button
                          onClick={() =>
                            runAction(() => apiFetch(`/api/v1/transfer-orders/${trf.id}/receive`, { method: "POST" }))
                          }
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-medium"
                        >
                          Receive at Destination
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : returns.length === 0 ? (
          <EmptyState title="No return orders" description="Create an RMA to process customer returns." />
        ) : (
          <div className="bg-card border rounded-xl divide-y">
            {returns.map((rma) => (
              <div key={rma.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{rma.reference}</span>
                      <StatusBadge label={rma.status} tone={STATUS_TONE[rma.status] ?? "neutral"} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Customer: {rma.customerName}
                      {rma.description ? ` · ${rma.description}` : ""}
                    </div>
                  </div>
                  {hasPermission("ORDER:UPDATE") && rma.status !== "COMPLETE" && (
                    <button
                      onClick={async () => {
                        const detail = await apiFetch<ReturnOrderView>(`/api/v1/return-orders/${rma.id}`);
                        const pendingLine = detail.lines.find((l) => l.outcome === "PENDING");
                        if (pendingLine) {
                          setReceivingRma({ rmaId: rma.id, lineId: pendingLine.id });
                        }
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium"
                    >
                      Receive &amp; Disposition
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateTransfer && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Create Transfer Order</h3>
                <button onClick={() => setShowCreateTransfer(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Source Location *</label>
                  <select
                    required
                    value={trfForm.sourceLocationId}
                    onChange={(e) => setTrfForm({ ...trfForm, sourceLocationId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select source...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Destination Location *</label>
                  <select
                    required
                    value={trfForm.destinationLocationId}
                    onChange={(e) => setTrfForm({ ...trfForm, destinationLocationId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select destination...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Item *</label>
                  <select
                    required
                    value={trfForm.stockItemId}
                    onChange={(e) => setTrfForm({ ...trfForm, stockItemId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select stock item...</option>
                    {stockItems
                      .filter((s) => !s.building && Number(s.quantity) > 0)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.partName} ({s.locationPathString ?? "Unassigned"}) · Qty: {s.quantity}
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
                    value={trfForm.quantity}
                    onChange={(e) => setTrfForm({ ...trfForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateTransfer(false)} className="px-4 py-2 text-sm border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">
                    Create Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showCreateReturn && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Create Return Order (RMA)</h3>
                <button onClick={() => setShowCreateReturn(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <select
                    required
                    value={rmaForm.customerId}
                    onChange={(e) => setRmaForm({ ...rmaForm, customerId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shipped Stock Item *</label>
                  <select
                    required
                    value={rmaForm.stockItemId}
                    onChange={(e) => setRmaForm({ ...rmaForm, stockItemId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select shipped stock item...</option>
                    {stockItems
                      .filter((s) => s.customerId != null)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.partName} {s.serialNumber ? `SN:${s.serialNumber}` : `Qty:${s.quantity}`}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCreateReturn(false)} className="px-4 py-2 text-sm border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">
                    Create RMA
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {receivingRma && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Receive &amp; Disposition Return</h3>
                <button onClick={() => setReceivingRma(null)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await apiFetch(`/api/v1/return-orders/${receivingRma.rmaId}/lines/${receivingRma.lineId}/receive`, {
                      method: "POST",
                      body: JSON.stringify({
                        quarantineLocationId: receiveLocId || null,
                        outcome: receiveOutcome,
                      }),
                    });
                    setReceivingRma(null);
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Outcome *</label>
                  <select
                    value={receiveOutcome}
                    onChange={(e) => setReceiveOutcome(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="RESTOCK">RESTOCK (Status: OK)</option>
                    <option value="REPAIR">QUARANTINE / REPAIR</option>
                    <option value="SCRAP">SCRAP (Status: DAMAGED)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Receiving / Quarantine Location</label>
                  <select
                    value={receiveLocId}
                    onChange={(e) => setReceiveLocId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select location...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReceivingRma(null)} className="px-4 py-2 text-sm border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white">
                    Confirm Receipt
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
