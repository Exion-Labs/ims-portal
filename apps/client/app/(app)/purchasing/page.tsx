"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  CompanyView,
  LocationView,
  PageResponse,
  PurchaseOrderView,
} from "@ims/api-client";
import { DataTable, EmptyState, ErrorState, StatTile, StatusBadge } from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { Plus, Search, ShoppingCart, X } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  PLACED: "primary",
  IN_PROGRESS: "warning",
  COMPLETE: "success",
  ON_HOLD: "warning",
  CANCELLED: "danger",
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { me, hasPermission } = useEntitlements();

  const [poPage, setPoPage] = useState<PageResponse<PurchaseOrderView> | null>(null);
  const [suppliers, setSuppliers] = useState<CompanyView[]>([]);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    description: "",
    supplierReference: "",
    currency: me?.baseCurrency ?? "USD",
    destinationLocationId: "",
    targetDate: "",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageIndex));
      params.set("size", "25");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (statusFilter) params.set("status", statusFilter);

      const [orders, sups, locs] = await Promise.all([
        apiFetch<PageResponse<PurchaseOrderView>>(`/api/v1/purchase-orders?${params.toString()}`),
        apiFetch<PageResponse<CompanyView>>("/api/v1/companies?supplier=true&size=200"),
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
      ]);
      setPoPage(orders);
      setSuppliers(sups.content);
      setLocations(locs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreatePo(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const created = await apiFetch<PurchaseOrderView>("/api/v1/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: form.supplierId,
          description: form.description || null,
          supplierReference: form.supplierReference || null,
          currency: form.currency || null,
          destinationLocationId: form.destinationLocationId || null,
          targetDate: form.targetDate || null,
          notes: form.notes || null,
        }),
      });
      setShowCreate(false);
      router.push(`/purchasing/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create purchase order");
    }
  }

  const columns = useMemo<ColumnDef<PurchaseOrderView, unknown>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "PO Reference",
        cell: ({ row }) => (
          <Link
            href={`/purchasing/${row.original.id}`}
            className="font-mono text-[13px] font-semibold text-[#1D4ED8] hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        accessorKey: "supplierName",
        header: "Supplier",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[#18181B]">{row.original.supplierName}</div>
            {row.original.description && (
              <div className="max-w-xs truncate text-[12px] text-[#63636B]">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status}
            tone={STATUS_TONE[row.original.status] ?? "neutral"}
          />
        ),
      },
      {
        id: "lines",
        header: "Lines",
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-[#52525B]">
            {row.original.lines.length} line(s)
          </span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: () => <div className="text-right">Order Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-[12px]">
            <div className="font-semibold text-[#18181B]">
              {Number(row.original.totalAmount).toLocaleString()} {row.original.currency}
            </div>
            {row.original.currency !== row.original.tenantBaseCurrency && (
              <div className="text-[11px] text-[#63636B]">
                ≈ {Number(row.original.totalAmountInBase).toLocaleString()}{" "}
                {row.original.tenantBaseCurrency}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "targetDate",
        header: "Target Date",
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-[#52525B]">
            {row.original.targetDate ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <FeatureGate feature="PURCHASING" fallback="not-in-plan">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
              Purchase Orders & Receiving
            </h1>
            <p className="mt-0.5 text-[14px] text-[#52525B]">
              Create supplier orders, auto-price from tiered breaks, and receive inbound deliveries
              into warehouse bins.
            </p>
          </div>

          {hasPermission("ORDER:CREATE") && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setForm((prev) => ({
                  ...prev,
                  supplierId: suppliers[0]?.id ?? "",
                  currency: suppliers[0]?.defaultCurrency ?? me?.baseCurrency ?? "USD",
                }));
                setShowCreate(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-3.5 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              <Plus className="h-4 w-4" />
              <span>New Purchase Order</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Total Purchase Orders"
            value={poPage?.totalElements ?? 0}
            hint="All inbound orders"
          />
          <StatTile
            label="Open / Placed"
            value={
              poPage?.content.filter((o) => o.status === "PLACED" || o.status === "IN_PROGRESS")
                .length ?? 0
            }
            hint="Awaiting warehouse receiving"
          />
          <StatTile
            label="Registered Suppliers"
            value={suppliers.length}
            hint="Active vendor accounts"
          />
          <StatTile
            label="Base Currency"
            value={me?.baseCurrency ?? "USD"}
            hint="Rollup currency"
            mono
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#E4E4E7] bg-white p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#63636B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              placeholder="Search PO reference, description, or vendor reference…"
              className="h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] pr-3 pl-9 text-[13px]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPageIndex(0);
            }}
            className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="PLACED">PLACED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETE">COMPLETE</option>
            <option value="ON_HOLD">ON_HOLD</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : !loading && (poPage?.content.length ?? 0) === 0 ? (
          <EmptyState
            title="No purchase orders yet"
            description="Create a purchase order for a supplier to track inbound stock and receiving."
            action={
              hasPermission("ORDER:CREATE") && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Purchase Order</span>
                </button>
              )
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={poPage?.content ?? []}
            isLoading={loading}
            pageIndex={pageIndex}
            pageSize={25}
            totalCount={poPage?.totalElements}
            onPageChange={setPageIndex}
          />
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
                <h2 className="text-[16px] font-semibold text-[#18181B]">New Purchase Order</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded p-1 text-[#63636B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePo} className="mt-4 space-y-3">
                {formError && (
                  <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Supplier *</label>
                  <select
                    required
                    value={form.supplierId}
                    onChange={(e) => {
                      const sup = suppliers.find((s) => s.id === e.target.value);
                      setForm({
                        ...form,
                        supplierId: e.target.value,
                        currency: sup?.defaultCurrency ?? form.currency,
                      });
                    }}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.defaultCurrency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#18181B]">
                      Currency
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#18181B]">
                      Default Receiving Bin
                    </label>
                    <select
                      value={form.destinationLocationId}
                      onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                    >
                      <option value="">Select bin at receive time</option>
                      {locations
                        .filter((l) => !l.structural)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.pathString}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Monthly component replenishment"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                  >
                    Create PO
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
