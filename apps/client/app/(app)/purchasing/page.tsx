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
import {
  Alert,
  AlertDescription,
  Button,
  Combobox,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
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
import { ListToolbar } from "@/components/list-toolbar";
import { Plus, ShoppingCart, X } from "lucide-react";

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
      toast.success("Purchase order created", { description: created.reference });
      router.push(`/purchasing/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create purchase order");
      toastApiError(err, "Failed to create purchase order");
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
            className="font-mono text-[13px] font-semibold text-[var(--brand-primary)] hover:underline"
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
            <div className="font-medium text-[var(--text-primary)]">{row.original.supplierName}</div>
            {row.original.description && (
              <div className="max-w-xs truncate text-[12px] text-[var(--text-muted)]">
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
          <span className="font-mono text-[12px] text-[var(--text-secondary)]">
            {row.original.lines.length} line(s)
          </span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: () => <div className="text-right">Order Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-[12px]">
            <div className="font-semibold text-[var(--text-primary)]">
              {Number(row.original.totalAmount).toLocaleString()} {row.original.currency}
            </div>
            {row.original.currency !== row.original.tenantBaseCurrency && (
              <div className="text-[11px] text-[var(--text-muted)]">
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
          <span className="font-mono text-[12px] text-[var(--text-secondary)]">
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

        <ListToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setPageIndex(0);
          }}
          searchPlaceholder="Search PO reference, description, or vendor reference…"
          filters={
            <Select
              value={statusFilter || "__all__"}
              onValueChange={(val) => {
                setStatusFilter(val === "__all__" ? "" : val);
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="PLACED">PLACED</SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="COMPLETE">COMPLETE</SelectItem>
                <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          }
          primaryAction={
            hasPermission("ORDER:CREATE")
              ? {
                  label: "New Purchase Order",
                  onClick: () => {
                    setFormError(null);
                    setForm((prev) => ({
                      ...prev,
                      supplierId: suppliers[0]?.id ?? "",
                      currency: suppliers[0]?.defaultCurrency ?? me?.baseCurrency ?? "USD",
                    }));
                    setShowCreate(true);
                  },
                }
              : undefined
          }
        />

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
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-4 text-[13px] font-medium text-white"
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

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Purchase Order</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreatePo} className="space-y-3">
              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label>Supplier *</Label>
                <Combobox
                  value={form.supplierId}
                  onValueChange={(val) => {
                    const sup = suppliers.find((s) => s.id === val);
                    setForm({
                      ...form,
                      supplierId: val,
                      currency: sup?.defaultCurrency ?? form.currency,
                    });
                  }}
                  placeholder="Select supplier…"
                  searchPlaceholder="Search suppliers…"
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.defaultCurrency})`,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Input
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default Receiving Bin</Label>
                  <Combobox
                    value={form.destinationLocationId}
                    onValueChange={(val) => setForm({ ...form, destinationLocationId: val })}
                    placeholder="Select bin at receive time"
                    searchPlaceholder="Search bins…"
                    options={[
                      { value: "", label: "Select bin at receive time" },
                      ...locations
                        .filter((l) => !l.structural)
                        .map((l) => ({ value: l.id, label: l.pathString })),
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Monthly component replenishment"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.supplierId}>
                  Create PO
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
