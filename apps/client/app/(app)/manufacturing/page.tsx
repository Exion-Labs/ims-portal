"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  BuildOrderView,
  LocationView,
  PageResponse,
  PartView,
} from "@ims/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
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
import { X } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  PRODUCTION: "warning",
  COMPLETE: "success",
  CANCELLED: "danger",
};

export default function ManufacturingPage() {
  const router = useRouter();
  const { hasPermission } = useEntitlements();

  const [buildPage, setBuildPage] = useState<PageResponse<BuildOrderView> | null>(null);
  const [assemblyParts, setAssemblyParts] = useState<PartView[]>([]);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    partId: "",
    title: "",
    quantity: "1",
    sourceLocationId: "",
    destinationLocationId: "",
    targetDate: "",
    notes: "",
    createChildBuilds: false,
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

      const [builds, parts, locs] = await Promise.all([
        apiFetch<PageResponse<BuildOrderView>>(`/api/v1/builds?${params.toString()}`),
        apiFetch<PageResponse<PartView>>("/api/v1/parts?assembly=true&size=200"),
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
      ]);
      setBuildPage(builds);
      setAssemblyParts(parts.content);
      setLocations(locs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load build orders");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateBuild(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const created = await apiFetch<BuildOrderView>("/api/v1/builds", {
        method: "POST",
        body: JSON.stringify({
          partId: form.partId,
          title: form.title || null,
          quantity: Number(form.quantity),
          sourceLocationId: form.sourceLocationId || null,
          destinationLocationId: form.destinationLocationId || null,
          targetDate: form.targetDate || null,
          notes: form.notes || null,
          createChildBuilds: form.createChildBuilds,
        }),
      });
      setShowCreate(false);
      toast.success("Build order created", { description: created.reference });
      router.push(`/manufacturing/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create build order");
      toastApiError(err, "Failed to create build order");
    }
  }

  const columns = useMemo<ColumnDef<BuildOrderView, unknown>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => (
          <Link
            href={`/manufacturing/${row.original.id}`}
            className="font-mono font-semibold text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.partIpn ? `${row.original.partIpn} · ` : ""}
              {row.original.partName}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status] ?? "neutral"} />
        ),
      },
      {
        id: "progress",
        header: "Completed",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.completed} / {row.original.quantity} {row.original.partUnit ?? ""}
          </span>
        ),
      },
      {
        accessorKey: "destinationLocationPath",
        header: "Destination",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.destinationLocationPath ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "targetDate",
        header: "Target Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.targetDate ?? "—"}</span>
        ),
      },
    ],
    []
  );

  const items = buildPage?.content ?? [];
  const pendingCount = items.filter((b) => b.status === "PENDING").length;
  const inProdCount = items.filter((b) => b.status === "PRODUCTION").length;

  return (
    <FeatureGate feature="MANUFACTURING">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile label="Total Build Orders" value={buildPage?.totalElements ?? 0} />
          <StatTile label="Pending (Page)" value={pendingCount} />
          <StatTile label="In Production (Page)" value={inProdCount} />
        </div>

        <ListToolbar
          searchQuery={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setPageIndex(0);
          }}
          searchPlaceholder="Search BO reference, title, or assembly..."
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
                <SelectItem value="PRODUCTION">PRODUCTION</SelectItem>
                <SelectItem value="COMPLETE">COMPLETE</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          }
          primaryAction={
            hasPermission("BUILD:CREATE")
              ? {
                  label: "New Build Order",
                  onClick: () => setShowCreate(true),
                }
              : undefined
          }
        />

        {error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : !loading && items.length === 0 ? (
          <EmptyState
            title="No build orders found"
            description="Create a build order for any assembly part with a Bill of Materials."
          />
        ) : (
          <DataTable
            columns={columns}
            data={items}
            isLoading={loading}
            pageIndex={pageIndex}
            pageSize={25}
            totalCount={buildPage?.totalElements ?? items.length}
            onPageChange={setPageIndex}
            renderMobileCard={(b) => (
              <Link href={`/manufacturing/${b.id}`} className="block space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[12px] font-semibold text-primary">
                      {b.reference}
                    </span>
                    <div className="truncate text-[14px] font-semibold">{b.title || b.partName}</div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {b.partIpn ? `${b.partIpn} · ` : ""}
                      {b.partName}
                    </div>
                  </div>
                  <StatusBadge label={b.status} tone={STATUS_TONE[b.status] ?? "neutral"} />
                </div>
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span className="truncate">{b.destinationLocationPath ?? "No destination"}</span>
                  <span className="shrink-0 font-mono font-semibold text-foreground">
                    {b.completed} / {b.quantity} {b.partUnit ?? ""}
                  </span>
                </div>
              </Link>
            )}
          />
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Build Order</DialogTitle>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleCreateBuild} className="space-y-4">
              <div className="space-y-1">
                <Label>Assembly Part *</Label>
                <Combobox
                  value={form.partId}
                  onValueChange={(val) => setForm({ ...form, partId: val })}
                  placeholder="Select assembly part…"
                  searchPlaceholder="Search assemblies…"
                  options={assemblyParts.map((p) => ({
                    value: p.id,
                    label: `${p.ipn ? `${p.ipn} — ` : ""}${p.name}`,
                  }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={form.targetDate}
                    onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Optional build batch title"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Source Location</Label>
                  <Combobox
                    value={form.sourceLocationId}
                    onValueChange={(val) => setForm({ ...form, sourceLocationId: val })}
                    placeholder="Any location"
                    searchPlaceholder="Search locations…"
                    options={[
                      { value: "", label: "Any location" },
                      ...locations.map((l) => ({ value: l.id, label: l.path })),
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Destination Location</Label>
                  <Combobox
                    value={form.destinationLocationId}
                    onValueChange={(val) => setForm({ ...form, destinationLocationId: val })}
                    placeholder="Select destination…"
                    searchPlaceholder="Search locations…"
                    options={[
                      { value: "", label: "Unassigned" },
                      ...locations.map((l) => ({ value: l.id, label: l.path })),
                    ]}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px]">
                <Checkbox
                  checked={form.createChildBuilds}
                  onCheckedChange={(v) =>
                    setForm({ ...form, createChildBuilds: Boolean(v) })
                  }
                />
                <span>Automatically create child build orders for sub-assemblies</span>
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.partId}>
                  Create Build Order
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
