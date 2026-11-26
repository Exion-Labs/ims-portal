"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { apiFetch, CompanyView, PageResponse, SalesOrderView } from "@ims/api-client";
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
import { Plus } from "lucide-react";

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
      toast.success("Sales order created", { description: created.reference });
      router.push(`/sales/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create sales order");
      toastApiError(err, "Failed to create sales order");
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
        {/* Mobile Compact Stats Row */}
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          {[
            { label: "Total", value: soPage?.totalElements ?? 0 },
            { label: "Pending", value: items.filter((s) => s.status === "PENDING").length },
            { label: "Shipped", value: items.filter((s) => s.status === "SHIPPED").length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[10px] border border-[var(--border-subtle)] bg-card px-2 py-2.5 text-center text-[12px] text-[var(--text-secondary)]"
            >
              <span>{stat.label}: </span>
              <span className="font-semibold text-[var(--text-primary)]">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Desktop Stat Tiles */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-3">
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
          hideActionsOnMobile
          filters={
            <Select
              value={statusFilter || "__all__"}
              onValueChange={(val) => {
                setStatusFilter(val === "__all__" ? "" : val);
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
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
            renderMobileCard={(so) => (
              <Link href={`/sales/${so.id}`} className="block space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[12px] font-semibold text-primary">
                      {so.reference}
                    </span>
                    <div className="truncate text-[14px] font-semibold">{so.customerName}</div>
                  </div>
                  <StatusBadge label={so.status} tone={STATUS_TONE[so.status] ?? "neutral"} />
                </div>
                {so.description && (
                  <div className="truncate text-[12px] text-muted-foreground">{so.description}</div>
                )}
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span className="font-mono">
                    {so.customerReference ? `Ref: ${so.customerReference}` : so.currency}
                  </span>
                  <span>{so.targetDate ? `Ship by ${so.targetDate}` : "No target date"}</span>
                </div>
              </Link>
            )}
          />
        )}

        {/* Mobile Floating New Sales Order Button */}
        {hasPermission("ORDER:CREATE") && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            aria-label="New Sales Order"
            title="New Sales Order"
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-lg transition-transform hover:bg-[var(--brand-primary-hover)] active:scale-95 lg:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Sales Order</DialogTitle>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label>Customer *</Label>
                <Combobox
                  value={form.customerId}
                  onValueChange={(val) => setForm({ ...form, customerId: val })}
                  placeholder="Select customer…"
                  searchPlaceholder="Search customers…"
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Customer PO Ref</Label>
                  <Input
                    value={form.customerReference}
                    onChange={(e) => setForm({ ...form, customerReference: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    maxLength={3}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Target Ship Date</Label>
                <Input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.customerId}>
                  Create Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
