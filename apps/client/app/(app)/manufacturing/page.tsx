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
import { DataTable, EmptyState, ErrorState, StatTile, StatusBadge } from "@ims/ui";
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
      router.push(`/manufacturing/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create build order");
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
              <option value="PRODUCTION">PRODUCTION</option>
              <option value="COMPLETE">COMPLETE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
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
          />
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create Build Order</h2>
                <button onClick={() => setShowCreate(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              {formError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreateBuild} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Assembly Part *</label>
                  <select
                    required
                    value={form.partId}
                    onChange={(e) => setForm({ ...form, partId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  >
                    <option value="">Select assembly part...</option>
                    {assemblyParts.map((p) => (
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
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Date</label>
                    <input
                      type="date"
                      value={form.targetDate}
                      onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Optional build batch title"
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Source Location</label>
                    <select
                      value={form.sourceLocationId}
                      onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    >
                      <option value="">Any location</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.path}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Destination Location</label>
                    <select
                      value={form.destinationLocationId}
                      onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}
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
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.createChildBuilds}
                    onChange={(e) => setForm({ ...form, createChildBuilds: e.target.checked })}
                  />
                  Automatically create child build orders for sub-assemblies
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-sm border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    Create Build Order
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
