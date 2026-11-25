"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  LocationView,
  PurchaseOrderLineView,
  PurchaseOrderView,
  SupplierPartView,
} from "@ims/api-client";
import { ErrorState, StatTile, StatusBadge } from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  PackageCheck,
  Plus,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

const STATUS_STEPS = ["PENDING", "PLACED", "IN_PROGRESS", "COMPLETE"] as const;

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const poId = params.id;
  const { hasPermission } = useEntitlements();

  const [po, setPo] = useState<PurchaseOrderView | null>(null);
  const [supplierParts, setSupplierParts] = useState<SupplierPartView[]>([]);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add line state
  const [selectedSpId, setSelectedSpId] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [linePrice, setLinePrice] = useState("");

  // Receive modal state
  const [receiveLine, setReceiveLine] = useState<PurchaseOrderLineView | null>(null);
  const [recvQtyPacks, setRecvQtyPacks] = useState("");
  const [recvLocationId, setRecvLocationId] = useState("");
  const [recvBatchCode, setRecvBatchCode] = useState("");
  const [recvNotes, setRecvNotes] = useState("");
  const [recvError, setRecvError] = useState<string | null>(null);

  // Printable Document preview
  const [docHtml, setDocHtml] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const order = await apiFetch<PurchaseOrderView>(`/api/v1/purchase-orders/${poId}`);
      setPo(order);
      const [sps, locs] = await Promise.all([
        apiFetch<SupplierPartView[]>(`/api/v1/companies/${order.supplierId}/supplier-parts`),
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
      ]);
      setSupplierParts(sps);
      setLocations(locs);
      if (sps.length > 0 && !selectedSpId) {
        setSelectedSpId(sps[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  }, [poId, selectedSpId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    if (!po || !selectedSpId) return;
    setActionError(null);
    try {
      const updated = await apiFetch<PurchaseOrderView>(
        `/api/v1/purchase-orders/${po.id}/lines`,
        {
          method: "POST",
          body: JSON.stringify({
            supplierPartId: selectedSpId,
            quantity: Number(lineQty),
            unitPrice: linePrice.trim() ? Number(linePrice) : null,
          }),
        }
      );
      setPo(updated);
      setLineQty("1");
      setLinePrice("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to add line item");
    }
  }

  async function handleRemoveLine(lineId: string) {
    if (!po) return;
    setActionError(null);
    try {
      const updated = await apiFetch<PurchaseOrderView>(
        `/api/v1/purchase-orders/${po.id}/lines/${lineId}`,
        { method: "DELETE" }
      );
      setPo(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove line");
    }
  }

  async function handleTransition(action: "place" | "hold" | "cancel") {
    if (!po) return;
    setActionError(null);
    try {
      const updated = await apiFetch<PurchaseOrderView>(
        `/api/v1/purchase-orders/${po.id}/${action}`,
        { method: "POST" }
      );
      setPo(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} order`);
    }
  }

  async function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!po || !receiveLine) return;
    setRecvError(null);
    try {
      await apiFetch(`/api/v1/purchase-orders/${po.id}/receive`, {
        method: "POST",
        body: JSON.stringify({
          lines: [
            {
              lineItemId: receiveLine.id,
              quantityPacks: Number(recvQtyPacks),
              locationId: recvLocationId || null,
              batchCode: recvBatchCode || null,
              notes: recvNotes || null,
            },
          ],
        }),
      });
      setReceiveLine(null);
      await loadAll();
    } catch (err) {
      setRecvError(err instanceof Error ? err.message : "Receiving failed");
    }
  }

  async function handleOpenDocument() {
    if (!po) return;
    const res = await fetch(`/api/v1/purchase-orders/${po.id}/document`);
    const html = await res.text();
    setDocHtml(html);
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[12px] bg-white" />;
  }
  if (error || !po) {
    return <ErrorState message={error ?? "Purchase order not found"} onRetry={loadAll} />;
  }

  const canEditLines =
    hasPermission("ORDER:UPDATE") && po.status !== "COMPLETE" && po.status !== "CANCELLED";
  const canReceive =
    hasPermission("ORDER:UPDATE") && (po.status === "PLACED" || po.status === "IN_PROGRESS");

  return (
    <FeatureGate feature="PURCHASING" fallback="not-in-plan">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/purchasing"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Purchase Orders</span>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span className="rounded-[8px] border border-[var(--border-brand)] bg-[var(--brand-tint)] px-2.5 py-1 font-mono text-[14px] font-semibold text-[var(--brand-primary)]">
                {po.reference}
              </span>
              <h1 className="text-[22px] font-semibold text-[var(--text-primary)]">{po.supplierName}</h1>
              <StatusBadge label={po.status} tone={po.status === "COMPLETE" ? "success" : "primary"} />
            </div>
            {po.description && <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{po.description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDocument}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-[var(--text-primary)]"
            >
              <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
              <span>PO Document</span>
            </button>

            {hasPermission("ORDER:UPDATE") &&
              (po.status === "PENDING" || po.status === "ON_HOLD") && (
                <button
                  type="button"
                  onClick={() => handleTransition("place")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-3.5 text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
                >
                  <Send className="h-4 w-4" />
                  <span>Place Order</span>
                </button>
              )}

            {hasPermission("ORDER:UPDATE") &&
              po.status !== "COMPLETE" &&
              po.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => handleTransition("cancel")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/40 px-3 text-[13px] font-medium text-[var(--status-danger-fg)]"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              )}
          </div>
        </div>

        {/* Status Stepper */}
        <div className="grid grid-cols-4 gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-white p-3">
          {STATUS_STEPS.map((step, idx) => {
            const currentIdx = STATUS_STEPS.indexOf(po.status as (typeof STATUS_STEPS)[number]);
            const reached = currentIdx >= idx;
            return (
              <div
                key={step}
                className={`flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] font-medium ${
                  reached
                    ? "bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                    : "bg-[var(--bg-canvas)] text-[var(--text-muted)]"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        {actionError && (
          <div className="rounded-[8px] border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/60 px-4 py-2.5 text-[13px] text-[var(--status-danger-fg)]">
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Order Total"
            value={`${Number(po.totalAmount).toLocaleString()} ${po.currency}`}
            hint={`Base: ${Number(po.totalAmountInBase).toLocaleString()} ${po.tenantBaseCurrency}`}
            mono
          />
          <StatTile label="Line Items" value={po.lines.length} hint="Supplier SKUs on order" />
          <StatTile
            label="Issue Date"
            value={po.issueDate ?? "Draft"}
            hint={`Target: ${po.targetDate ?? "Unset"}`}
            mono
          />
          <StatTile
            label="Default Receiving Bin"
            value={po.destinationLocationPath ?? "Select at receive"}
            hint="Non-structural warehouse bin"
          />
        </div>

        {/* Line Items Builder & Table */}
        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Purchase Order Line Items</h2>

          {canEditLines && (
            <form
              onSubmit={handleAddLine}
              className="mt-3 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3"
            >
              <select
                required
                value={selectedSpId}
                onChange={(e) => setSelectedSpId(e.target.value)}
                className="h-9 min-w-[260px] flex-1 rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px]"
              >
                <option value="">Select supplier SKU…</option>
                {supplierParts.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.sku} — {sp.partIpn} ({sp.partName}) · 1 pack = {sp.packQuantity}{" "}
                    {sp.partUnit}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="any"
                required
                value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
                placeholder="Packs"
                className="h-9 w-24 rounded-[8px] border border-[var(--border-subtle)] bg-white px-2.5 font-mono text-[13px]"
              />

              <input
                type="number"
                step="any"
                value={linePrice}
                onChange={(e) => setLinePrice(e.target.value)}
                placeholder={`Auto (${po.currency}/pack)`}
                className="h-9 w-36 rounded-[8px] border border-[var(--border-subtle)] bg-white px-2.5 font-mono text-[13px]"
              />

              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1 rounded-[8px] bg-[var(--brand-primary)] px-3.5 text-[13px] font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                <span>Add Line</span>
              </button>
            </form>
          )}

          <div className="mt-4 overflow-x-auto rounded-[8px] border border-[var(--border-subtle)]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="ims-table-head">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2.5 font-semibold">Supplier SKU</th>
                  <th className="px-4 py-2.5 font-semibold">Part</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ordered / Received</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Unit Price</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Line Total</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {po.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      No line items added yet.
                    </td>
                  </tr>
                ) : (
                  po.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-[var(--text-primary)]">
                        {l.supplierSku}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/parts/${l.partId}`}
                          className="font-mono text-[var(--brand-primary)] hover:underline"
                        >
                          {l.partIpn}
                        </Link>
                        <div className="text-[12px] text-[var(--text-secondary)]">{l.partName}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[12px]">
                        <div>
                          {l.received} / {l.quantity} packs
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          ({l.internalQuantityTotal} {l.partUnit} total)
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[12px]">
                        {l.unitPrice} {l.currency}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[12px] font-semibold">
                        {l.lineTotal} {l.currency}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canReceive && l.remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setReceiveLine(l);
                                setRecvQtyPacks(String(l.remaining));
                                setRecvLocationId(
                                  l.destinationLocationId ?? po.destinationLocationId ?? ""
                                );
                                setRecvBatchCode("");
                                setRecvNotes("");
                                setRecvError(null);
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded bg-[var(--status-success-fg)] px-2.5 text-[11px] font-medium text-white hover:opacity-90"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              <span>Receive</span>
                            </button>
                          )}
                          {canEditLines && l.received === 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(l.id)}
                              className="rounded p-1 text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Receive Items into Stock */}
        {receiveLine && (
          <div className="ims-modal-backdrop">
            <div className="ims-modal-panel max-w-md">
              <div className="ims-modal-header">
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  Receive into Stock · {receiveLine.partIpn}
                </h2>
                <button
                  type="button"
                  onClick={() => setReceiveLine(null)}
                  className="rounded p-1 text-[var(--text-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleReceiveSubmit} className="mt-4 space-y-3">
                {recvError && (
                  <div className="ims-alert-error">
                    {recvError}
                  </div>
                )}

                <div className="rounded-[8px] bg-[var(--bg-canvas)] p-3 text-[12px]">
                  <div>
                    Remaining: <strong>{receiveLine.remaining}</strong> packs (×{" "}
                    {receiveLine.packQuantity} {receiveLine.partUnit}/pack)
                  </div>
                  <div className="mt-0.5 font-mono text-[var(--brand-primary)]">
                    Receiving {Number(recvQtyPacks || 0) * receiveLine.packQuantity}{" "}
                    {receiveLine.partUnit} into warehouse stock
                  </div>
                </div>

                <div>
                  <label className="ims-label">
                    Quantity (Packs) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={recvQtyPacks}
                    onChange={(e) => setRecvQtyPacks(e.target.value)}
                    className="ims-input mt-1 font-mono"
                  />
                </div>

                <div>
                  <label className="ims-label">
                    Destination Bin *
                  </label>
                  <select
                    required
                    value={recvLocationId}
                    onChange={(e) => setRecvLocationId(e.target.value)}
                    className="ims-select mt-1"
                  >
                    <option value="">Select warehouse bin…</option>
                    {locations
                      .filter((l) => !l.structural)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.pathString}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="ims-label">
                    Batch / Lot Code
                  </label>
                  <input
                    type="text"
                    value={recvBatchCode}
                    onChange={(e) => setRecvBatchCode(e.target.value)}
                    placeholder="LOT-RECV-01"
                    className="ims-input mt-1 font-mono"
                  />
                </div>

                <div className="ims-modal-footer">
                  <button
                    type="button"
                    onClick={() => setReceiveLine(null)}
                    className="ims-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 rounded-[8px] bg-[var(--status-success-fg)] px-4 text-[13px] font-medium text-white"
                  >
                    Confirm Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Printable PO Document Preview */}
        {docHtml && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[12px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
                <span className="text-[14px] font-semibold">
                  Purchase Order Document · {po.reference}
                </span>
                <button
                  type="button"
                  onClick={() => setDocHtml(null)}
                  className="rounded p-1 text-[var(--text-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <iframe
                title="PO Document"
                srcDoc={docHtml}
                className="h-[75vh] w-full border-0"
              />
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
