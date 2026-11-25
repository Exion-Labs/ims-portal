"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { apiFetch, CompanyView, PageResponse, SalesOrderView } from "@ims/api-client";
import { DataTable, EmptyState, ErrorState, StatTile, StatusBadge } from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { ListToolbar } from "@/components/list-toolbar";
import { X } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  IN_PROGRESS: "warning",
  SHIPPED: "success",
  CANCELLED: "danger",
};

export default function SalesOrdersPage() {
  const router = useRouter();
  const { me, hasPermission } = useEntitlements();

  const [soPage, setSoPage] = useState<PageResponse<SalesOrderView> | null>(null);
  const [customers, setCustomers] = useState<CompanyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    customerReference: "",
    description: "",
    currency: me?.baseCurrency ?? "USD",
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

      const [orders, custs] = await Promise.all([
        apiFetch<PageResponse<SalesOrderView>>(`/api/v1/sales-orders?${params.toString()}`),
        apiFetch<PageResponse<CompanyView>>("/api/v1/companies?customer=true&size=200"),
      ]);
      setSoPage(orders);
      setCustomers(custs.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales orders");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const created = await apiFetch<SalesOrderView>("/api/v1/sales-orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: form.customerId,
          customerReference: form.customerReference || null,
          description: form.description || null,
          currency: form.currency || "USD",
          targetDate: form.targetDate || null,
          notes: form.notes || null,
        }),
      });
      setShowCreate(false);
      router.push(`/sales/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create sales order");
    }
  }

  const columns = useMemo<ColumnDef<SalesOrderView, unknown>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => (
          <Link href={`/sales/${row.original.id}`} className="font-mono font-semibold text-primary hover:underline">
            {row.original.reference}
          </Link>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customerName}</div>
            {row.original.customerReference && (
              <div className="text-xs text-muted-foreground font-mono">Ref: {row.original.customerReference}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status] ?? "neutral"} />
        ),
      },
      {
        accessorKey: "currency",
        header: "Currency",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.currency}</span>,
      },
      {
        accessorKey: "targetDate",
        header: "Target Date",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.targetDate ?? "—"}</span>,
      },
    ],
    []
  );

  const items = soPage?.content ?? [];

  return (
    <FeatureGate feature="SALES">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile label="Total Sales Orders" value={soPage?.totalElements ?? 0} />
          <StatTile label="Pending (Page)" value={items.filter((s) => s.status === "PENDING").length} />
          <StatTile label="Shipped (Page)" value={items.filter((s) => s.status === "SHIPPED").length} />
        </div>

        <ListToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setPageIndex(0);
          }}
          searchPlaceholder="Search SO reference or customer PO..."
          filters={
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageIndex(0);
              }}
              className="h-9 rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          }
          primaryAction={
            hasPermission("ORDER:CREATE")
              ? {
                  label: "New Sales Order",
                  onClick: () => setShowCreate(true),
                }
              : undefined
          }
        />

        {error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : !loading && items.length === 0 ? (
          <EmptyState title="No sales orders found" description="Create a sales order for a customer company." />
        ) : (
          <DataTable
            columns={columns}
            data={items}
            isLoading={loading}
            pageIndex={pageIndex}
            pageSize={25}
            totalCount={soPage?.totalElements ?? items.length}
            onPageChange={setPageIndex}
          />
        )}

        {showCreate && (
          <div className="ims-modal-backdrop bg-black/50">
            <div className="bg-card border rounded-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create Sales Order</h2>
                <button onClick={() => setShowCreate(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <select
                    required
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer PO Ref</label>
                    <input
                      value={form.customerReference}
                      onChange={(e) => setForm({ ...form, customerReference: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <input
                      value={form.currency}
                      maxLength={3}
                      onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Ship Date</label>
                  <input
                    type="date"
                    value={form.targetDate}
                    onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium">
                    Create Order
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
