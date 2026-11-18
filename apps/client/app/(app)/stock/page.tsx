"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  LocationView,
  PageResponse,
  PartView,
  ScanResolutionResult,
  StockItemTestResultView,
  StockItemView,
  StockTrackingView,
} from "@ims/api-client";
import {
  BulkActionBar,
  DataTable,
  EmptyState,
  ErrorState,
  ImportWizard,
  StatTile,
  StatusBadge,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import {
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  FolderPlus,
  GitFork,
  GitMerge,
  Hash,
  History,
  MapPin,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

type OperationModal =
  | null
  | { type: "transfer"; item: StockItemView }
  | { type: "adjust"; item: StockItemView; mode: "add" | "remove" | "count" }
  | { type: "split"; item: StockItemView }
  | { type: "serialize"; item: StockItemView }
  | { type: "inspect"; item: StockItemView };

export default function StockAndLocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLocId = searchParams.get("locationId");
  const { me, hasPermission, hasFeature, refetch } = useEntitlements();

  const [locations, setLocations] = useState<LocationView[]>([]);
  const [parts, setParts] = useState<PartView[]>([]);
  const [stockPage, setStockPage] = useState<PageResponse<StockItemView> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialLocId);
  const [includeSublocations, setIncludeSublocations] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<StockItemView[]>([]);
  const [showImporter, setShowImporter] = useState(false);

  // Reconciliation status
  const [reconciling, setReconciling] = useState(false);
  const [reconcileBanner, setReconcileBanner] = useState<string | null>(null);

  // Create Stock Modal
  const [showCreateStock, setShowCreateStock] = useState(false);
  const [createStockForm, setCreateStockForm] = useState({
    partId: "",
    locationId: "",
    quantity: "100",
    serialNumber: "",
    batchCode: "",
    status: "OK",
    customBarcode: "",
    notes: "",
  });
  const [createStockError, setCreateStockError] = useState<string | null>(null);

  // Location Modal
  const [showLocationModal, setShowLocationModal] = useState<
    null | { mode: "create" | "edit" | "move"; location?: LocationView }
  >(null);
  const [locName, setLocName] = useState("");
  const [locDesc, setLocDesc] = useState("");
  const [locParentId, setLocParentId] = useState("");
  const [locType, setLocType] = useState("BIN");
  const [locStructural, setLocStructural] = useState(false);
  const [locExternal, setLocExternal] = useState(false);
  const [locBarcode, setLocBarcode] = useState("");
  const [locError, setLocError] = useState<string | null>(null);

  // Atomic Operation Modal
  const [opModal, setOpModal] = useState<OperationModal>(null);
  const [opQty, setOpQty] = useState("");
  const [opTargetLocId, setOpTargetLocId] = useState("");
  const [opSerialsText, setOpSerialsText] = useState("");
  const [opNotes, setOpNotes] = useState("");
  const [opError, setOpError] = useState<string | null>(null);

  // Inspect Sheet (Tracking History & Test Results)
  const [trackingList, setTrackingList] = useState<StockTrackingView[]>([]);
  const [testResults, setTestResults] = useState<StockItemTestResultView[]>([]);
  const [newTestName, setNewTestName] = useState("");
  const [newTestPassed, setNewTestPassed] = useState(true);
  const [newTestValue, setNewTestValue] = useState("");

  // Barcode Scanner Modal
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResolutionResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const [locs, partsRes] = await Promise.all([
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
        apiFetch<PageResponse<PartView>>("/api/v1/parts?size=200"),
      ]);
      setLocations(locs);
      setParts(partsRes.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load warehouse locations");
    }
  }, []);

  const loadStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageIndex));
      params.set("size", "25");
      if (selectedLocationId) {
        params.set("locationId", selectedLocationId);
        params.set("includeSublocations", String(includeSublocations));
      }
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await apiFetch<PageResponse<StockItemView>>(
        `/api/v1/stock-items?${params.toString()}`
      );
      setStockPage(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock items");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, selectedLocationId, includeSublocations, statusFilter, searchQuery]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  async function openInspectModal(item: StockItemView) {
    setOpModal({ type: "inspect", item });
    try {
      const trk = await apiFetch<StockTrackingView[]>(`/api/v1/stock-items/${item.id}/tracking`);
      setTrackingList(trk);
      if (hasFeature("QUALITY_TESTS")) {
        const tests = await apiFetch<StockItemTestResultView[]>(
          `/api/v1/stock-items/${item.id}/test-results`
        );
        setTestResults(tests);
      }
    } catch {
      setTrackingList([]);
      setTestResults([]);
    }
  }

  async function handleCreateStock(e: React.FormEvent) {
    e.preventDefault();
    setCreateStockError(null);
    try {
      await apiFetch<StockItemView>("/api/v1/stock-items", {
        method: "POST",
        body: JSON.stringify({
          partId: createStockForm.partId,
          locationId: createStockForm.locationId || null,
          quantity: Number(createStockForm.quantity),
          serialNumber: createStockForm.serialNumber || null,
          batchCode: createStockForm.batchCode || null,
          status: createStockForm.status || "OK",
          customBarcode: createStockForm.customBarcode || null,
          notes: createStockForm.notes || null,
        }),
      });
      setShowCreateStock(false);
      await Promise.all([loadStock(), loadMetadata()]);
    } catch (err) {
      setCreateStockError(err instanceof Error ? err.message : "Failed to create stock");
    }
  }

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!showLocationModal) return;
    setLocError(null);
    try {
      if (showLocationModal.mode === "create") {
        await apiFetch<LocationView>("/api/v1/stock-locations", {
          method: "POST",
          body: JSON.stringify({
            name: locName,
            description: locDesc || null,
            parentId: locParentId || null,
            locationType: locType,
            structural: locStructural,
            externalLocation: locExternal,
            customBarcode: locBarcode || null,
          }),
        });
      } else if (showLocationModal.mode === "edit" && showLocationModal.location) {
        await apiFetch<LocationView>(`/api/v1/stock-locations/${showLocationModal.location.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: locName,
            description: locDesc || null,
            locationType: locType,
            structural: locStructural,
            externalLocation: locExternal,
            customBarcode: locBarcode,
          }),
        });
      } else if (showLocationModal.mode === "move" && showLocationModal.location) {
        await apiFetch<LocationView>(
          `/api/v1/stock-locations/${showLocationModal.location.id}/move`,
          {
            method: "POST",
            body: JSON.stringify({ newParentId: locParentId || null }),
          }
        );
      }
      setShowLocationModal(null);
      await Promise.all([loadMetadata(), loadStock()]);
      refetch();
    } catch (err) {
      setLocError(err instanceof Error ? err.message : "Location save failed");
    }
  }

  async function handleDeleteLocation(loc: LocationView) {
    try {
      await apiFetch<void>(`/api/v1/stock-locations/${loc.id}?mode=REPARENT`, {
        method: "DELETE",
      });
      if (selectedLocationId === loc.id) setSelectedLocationId(null);
      await Promise.all([loadMetadata(), loadStock()]);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete location");
    }
  }

  async function handleRunStockOperation(e: React.FormEvent) {
    e.preventDefault();
    if (!opModal || opModal.type === "inspect") return;
    setOpError(null);
    try {
      if (opModal.type === "transfer") {
        await apiFetch(`/api/v1/stock-items/${opModal.item.id}/transfer`, {
          method: "POST",
          body: JSON.stringify({
            targetLocationId: opTargetLocId,
            quantity: Number(opQty),
            notes: opNotes || null,
          }),
        });
      } else if (opModal.type === "adjust") {
        await apiFetch(`/api/v1/stock-items/${opModal.item.id}/${opModal.mode}`, {
          method: "POST",
          body: JSON.stringify({
            quantity: Number(opQty),
            notes: opNotes || null,
          }),
        });
      } else if (opModal.type === "split") {
        await apiFetch(`/api/v1/stock-items/${opModal.item.id}/split`, {
          method: "POST",
          body: JSON.stringify({
            splitQuantity: Number(opQty),
            targetLocationId: opTargetLocId || null,
            notes: opNotes || null,
          }),
        });
      } else if (opModal.type === "serialize") {
        const serials = opSerialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        await apiFetch(`/api/v1/stock-items/${opModal.item.id}/serialize`, {
          method: "POST",
          body: JSON.stringify({
            serialNumbers: serials,
            targetLocationId: opTargetLocId || null,
            notes: opNotes || null,
          }),
        });
      }
      setOpModal(null);
      await Promise.all([loadStock(), loadMetadata()]);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Stock operation failed");
    }
  }

  async function handleMergeSelected() {
    if (selectedItems.length < 2) return;
    try {
      await apiFetch("/api/v1/stock-items/merge", {
        method: "POST",
        body: JSON.stringify({
          stockItemIds: selectedItems.map((i) => i.id),
          targetLocationId: selectedItems[0].locationId,
          notes: "Bulk merged from stock table",
        }),
      });
      setSelectedItems([]);
      await Promise.all([loadStock(), loadMetadata()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge selected items");
    }
  }

  async function handleRecordTestResult(e: React.FormEvent) {
    e.preventDefault();
    if (!opModal || opModal.type !== "inspect") return;
    try {
      await apiFetch(`/api/v1/stock-items/${opModal.item.id}/test-results`, {
        method: "POST",
        body: JSON.stringify({
          testName: newTestName,
          passed: newTestPassed,
          value: newTestValue || null,
        }),
      });
      setNewTestName("");
      setNewTestValue("");
      await openInspectModal(opModal.item);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Failed to record test result");
    }
  }

  async function handleScanResolve(e: React.FormEvent) {
    e.preventDefault();
    setScanError(null);
    setScanResult(null);
    try {
      const res = await apiFetch<ScanResolutionResult>("/api/v1/barcode/scan", {
        method: "POST",
        body: JSON.stringify({ barcode: scanInput }),
      });
      setScanResult(res);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Barcode not recognized");
    }
  }

  async function handleReconcile() {
    setReconciling(true);
    setReconcileBanner(null);
    try {
      const res = await apiFetch<{
        partsChecked: number;
        driftsFoundAndCorrected: number;
      }>("/api/v1/stock/reconcile", { method: "POST" });
      setReconcileBanner(
        `Reconciled ${res.partsChecked} parts · ${res.driftsFoundAndCorrected} counter drifts detected`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setReconciling(false);
    }
  }

  const columns = useMemo<ColumnDef<StockItemView, unknown>[]>(
    () => [
      {
        accessorKey: "partIpn",
        header: "Part",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/parts/${row.original.partId}`}
              className="font-mono text-[13px] font-medium text-[#1D4ED8] hover:underline"
            >
              {row.original.partIpn}
            </Link>
            <div className="max-w-[220px] truncate text-[12px] text-[#52525B]">
              {row.original.partName}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "locationPathString",
        header: "Warehouse Location",
        cell: ({ row }) =>
          row.original.locationPathString ? (
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F4F4F5] px-2 py-0.5 text-[12px] text-[#18181B]">
              <MapPin className="h-3 w-3 text-[#1D4ED8]" />
              <span>{row.original.locationPathString}</span>
            </span>
          ) : (
            <span className="text-[12px] text-[#63636B]">Unassigned</span>
          ),
      },
      {
        id: "batchSerial",
        header: "Serial / Batch",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
              {item.serialNumber && (
                <span className="rounded border border-[#DDD6FE] bg-[#EDE9FE] px-2 py-0.5 text-[#6D28D9]">
                  SN: {item.serialNumber}
                </span>
              )}
              {item.batchCode && (
                <span className="rounded border border-[#E4E4E7] bg-[#F7F7F8] px-2 py-0.5 text-[#52525B]">
                  Batch: {item.batchCode}
                </span>
              )}
              {!item.serialNumber && !item.batchCode && (
                <span className="text-[#63636B]">—</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const st = row.original.status;
          const tone =
            st === "OK"
              ? "success"
              : st === "ATTENTION" || st === "QUARANTINED" || st === "IN_TRANSIT"
                ? "warning"
                : "danger";
          return <StatusBadge label={st} tone={tone} />;
        },
      },
      {
        accessorKey: "quantity",
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-[13px] font-semibold tabular-nums text-[#18181B]">
            {Number(row.original.quantity).toLocaleString()} {row.original.partUnit}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Stock Operations</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => {
                  setOpTargetLocId(item.locationId ?? "");
                  setOpQty(String(item.quantity));
                  setOpNotes("");
                  setOpError(null);
                  setOpModal({ type: "transfer", item });
                }}
                title="Transfer (full or partial auto-split)"
                className="rounded border border-[#E4E4E7] bg-white px-2 py-1 text-[11px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
              >
                Transfer
              </button>
              {!item.serialNumber && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOpQty(String(item.quantity));
                      setOpNotes("");
                      setOpError(null);
                      setOpModal({ type: "adjust", item, mode: "count" });
                    }}
                    className="rounded border border-[#E4E4E7] bg-white px-2 py-1 text-[11px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                  >
                    Count / +/-
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpQty("1");
                      setOpTargetLocId(item.locationId ?? "");
                      setOpNotes("");
                      setOpError(null);
                      setOpModal({ type: "split", item });
                    }}
                    className="rounded border border-[#E4E4E7] bg-white px-2 py-1 text-[11px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                  >
                    Split
                  </button>
                  {item.partTrackable && hasFeature("SERIAL_TRACKING") && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpSerialsText("");
                        setOpTargetLocId(item.locationId ?? "");
                        setOpNotes("");
                        setOpError(null);
                        setOpModal({ type: "serialize", item });
                      }}
                      className="rounded border border-[#DDD6FE] bg-[#EDE9FE]/60 px-2 py-1 text-[11px] font-medium text-[#6D28D9] hover:bg-[#EDE9FE]"
                    >
                      Serialize
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => openInspectModal(item)}
                className="inline-flex items-center gap-1 rounded border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-1 text-[11px] font-medium text-[#1D4ED8]"
              >
                <History className="h-3 w-3" />
                <span>History</span>
              </button>
            </div>
          );
        },
      },
    ],
    [hasFeature]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
            Warehouse Locations & Stock Engine
          </h1>
          <p className="mt-0.5 text-[14px] text-[#52525B]">
            Hierarchical <code className="font-mono text-[12px]">ltree</code> warehouse bins,
            pessimistic row-locked stock mutations, batched summary deltas, and barcode resolution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FeatureGate feature="BARCODES">
            <button
              type="button"
              onClick={() => {
                setScanInput("");
                setScanResult(null);
                setScanError(null);
                setShowScanner(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
            >
              <QrCode className="h-4 w-4 text-[#1D4ED8]" />
              <span>Scan Barcode</span>
            </button>
          </FeatureGate>

          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
          >
            <RefreshCw className={`h-4 w-4 text-[#166534] ${reconciling ? "animate-spin" : ""}`} />
            <span>{reconciling ? "Reconciling…" : "Verify & Reconcile"}</span>
          </button>

          <FeatureGate feature="IMPORT_EXPORT">
            <button
              type="button"
              onClick={() => setShowImporter((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#1D4ED8]" />
              <span>{showImporter ? "Hide Importer" : "Import Stock"}</span>
            </button>
          </FeatureGate>

          {hasPermission("STOCK:CREATE") && (
            <button
              type="button"
              onClick={() => {
                setCreateStockError(null);
                setCreateStockForm((prev) => ({
                  ...prev,
                  partId: parts[0]?.id ?? "",
                  locationId:
                    selectedLocation && !selectedLocation.structural ? selectedLocation.id : "",
                }));
                setShowCreateStock(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-3.5 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              <Plus className="h-4 w-4" />
              <span>New Stock Item</span>
            </button>
          )}
        </div>
      </div>

      {reconcileBanner && (
        <div className="flex items-center justify-between rounded-[10px] border border-[#BBF7D0] bg-[#DCFCE7]/70 px-4 py-2.5 text-[13px] text-[#166534]">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{reconcileBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setReconcileBanner(null)}
            className="text-[12px] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active Stock Lots / Serials"
          value={stockPage?.totalElements ?? 0}
          hint="Filtered batches & serialized items"
        />
        <StatTile
          label="Warehouse Locations"
          value={`${locations.length} / ${me?.limits?.MAX_LOCATIONS ?? "—"}`}
          hint={`${locations.filter((l) => !l.structural).length} storage bins`}
        />
        <StatTile
          label="Selected Location Scope"
          value={selectedLocation ? selectedLocation.name : "All Locations"}
          hint={selectedLocation ? selectedLocation.pathString : "Entire warehouse tree"}
        />
        <StatTile
          label="Concurrency Mode"
          value="Batched HQL Deltas"
          hint="PESSIMISTIC_WRITE + beforeCommit flush"
        />
      </div>

      {showImporter && (
        <ImportWizard
          targetType="STOCK"
          targetFields={[
            { key: "ipn", label: "Part IPN", required: true },
            { key: "quantity", label: "Quantity", required: true },
            { key: "location", label: "Location Name or Path", required: false },
            { key: "batchCode", label: "Batch / Lot Code", required: false },
            { key: "serialNumber", label: "Serial Number", required: false },
          ]}
        />
      )}

      {/* Split-Pane Layout: Left Warehouse Location Tree + Right Stock Items Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Pane: Locations Tree */}
        <div className="lg:col-span-3">
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-4">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <div className="text-[14px] font-semibold text-[#18181B]">Locations</div>
                <div className="text-[11px] text-[#63636B]">Warehouse / Room / Aisle / Bin</div>
              </div>
              {hasPermission("STOCK:CREATE") && (
                <button
                  type="button"
                  onClick={() => {
                    setLocName("");
                    setLocDesc("");
                    setLocParentId(selectedLocationId ?? "");
                    setLocType("BIN");
                    setLocStructural(false);
                    setLocExternal(false);
                    setLocBarcode("");
                    setLocError(null);
                    setShowLocationModal({ mode: "create" });
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-2.5 text-[12px] font-medium text-[#18181B] hover:border-[#1D4ED8]"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-[#1D4ED8]" />
                  <span>New</span>
                </button>
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-[12px] text-[#52525B]">
              <input
                type="checkbox"
                checked={includeSublocations}
                onChange={(e) => {
                  setIncludeSublocations(e.target.checked);
                  setPageIndex(0);
                }}
              />
              <span>Include sub-locations</span>
            </label>

            <div className="mt-3 max-h-[500px] space-y-0.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedLocationId(null);
                  setPageIndex(0);
                }}
                className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[13px] font-medium ${
                  selectedLocationId === null
                    ? "bg-[#EEF2FF] text-[#1D4ED8]"
                    : "text-[#18181B] hover:bg-[#F7F7F8]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Boxes className="h-3.5 w-3.5" />
                  <span>All Locations</span>
                </span>
                <span className="font-mono text-[11px] text-[#63636B]">{locations.length}</span>
              </button>

              {locations.map((loc) => {
                const active = selectedLocationId === loc.id;
                return (
                  <div
                    key={loc.id}
                    style={{ paddingLeft: `${Math.min(loc.depth, 6) * 14}px` }}
                    className="flex items-center justify-between rounded-[8px] pr-1 hover:bg-[#F7F7F8]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocationId(loc.id);
                        setPageIndex(0);
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-[13px] ${
                        active ? "bg-[#EEF2FF] font-semibold text-[#1D4ED8]" : "text-[#18181B]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <MapPin
                          className={`h-3.5 w-3.5 shrink-0 ${
                            loc.structural ? "text-[#92400E]" : "text-[#1D4ED8]"
                          }`}
                        />
                        <span className="truncate">{loc.name}</span>
                        <span className="rounded bg-[#F4F4F5] px-1 text-[10px] font-mono text-[#63636B]">
                          {loc.locationType}
                        </span>
                      </span>
                      <span className="ml-1 font-mono text-[11px] text-[#63636B]">
                        {loc.directItemCount}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedLocation && (
              <div className="mt-4 space-y-2 border-t border-[#E4E4E7] pt-3">
                <div className="text-[12px] font-medium text-[#18181B]">
                  {selectedLocation.pathString}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLocName(selectedLocation.name);
                      setLocDesc(selectedLocation.description ?? "");
                      setLocType(selectedLocation.locationType);
                      setLocStructural(selectedLocation.structural);
                      setLocExternal(selectedLocation.externalLocation);
                      setLocBarcode(selectedLocation.customBarcode ?? "");
                      setLocError(null);
                      setShowLocationModal({ mode: "edit", location: selectedLocation });
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded border border-[#E4E4E7] bg-white px-2 text-[11px] font-medium"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocParentId(selectedLocation.parentId ?? "");
                      setLocError(null);
                      setShowLocationModal({ mode: "move", location: selectedLocation });
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded border border-[#E4E4E7] bg-white px-2 text-[11px] font-medium"
                  >
                    <ArrowRightLeft className="h-3 w-3" />
                    <span>Move</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLocation(selectedLocation)}
                    className="inline-flex h-7 items-center gap-1 rounded border border-[#FECACA] bg-[#FEE2E2]/40 px-2 text-[11px] font-medium text-[#991B1B]"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Stock Filters + DataTable */}
        <div className="space-y-4 lg:col-span-9">
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
                placeholder="Search batch code, serial number, or custom barcode…"
                className="h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] pr-3 pl-9 text-[13px] focus:border-[#1D4ED8] focus:bg-white focus:outline-hidden"
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
              <option value="OK">OK</option>
              <option value="ATTENTION">ATTENTION</option>
              <option value="QUARANTINED">QUARANTINED</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="RETURNED">RETURNED</option>
            </select>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={loadStock} />
          ) : !loading && (stockPage?.content.length ?? 0) === 0 ? (
            <EmptyState
              title="No stock items in this view"
              description="Receive or create a stock batch to start tracking inventory quantities."
              action={
                hasPermission("STOCK:CREATE") && (
                  <button
                    type="button"
                    onClick={() => setShowCreateStock(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Stock Item</span>
                  </button>
                )
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={stockPage?.content ?? []}
              isLoading={loading}
              enableRowSelection
              onSelectedRowsChange={setSelectedItems}
              pageIndex={pageIndex}
              pageSize={25}
              totalCount={stockPage?.totalElements}
              onPageChange={setPageIndex}
            />
          )}
        </div>
      </div>

      {/* Bulk Action Bar (Merge Selected Batches) */}
      <BulkActionBar selectedCount={selectedItems.length} onClear={() => setSelectedItems([])}>
        {selectedItems.length >= 2 && (
          <button
            type="button"
            onClick={handleMergeSelected}
            className="inline-flex items-center gap-1 rounded-full bg-[#1D4ED8] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#1E40AF]"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>Merge {selectedItems.length} Batches</span>
          </button>
        )}
      </BulkActionBar>

      {/* Modal: Create Stock Item */}
      {showCreateStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">Create Stock Item</h2>
              <button
                type="button"
                onClick={() => setShowCreateStock(false)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStock} className="mt-4 space-y-3">
              {createStockError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {createStockError}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">Part *</label>
                <select
                  required
                  value={createStockForm.partId}
                  onChange={(e) =>
                    setCreateStockForm({ ...createStockForm, partId: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                >
                  <option value="">Select part…</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ipn} — {p.name} ({p.unit}) {p.trackable ? "[Trackable]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">
                  Storage Location (Non-structural)
                </label>
                <select
                  value={createStockForm.locationId}
                  onChange={(e) =>
                    setCreateStockForm({ ...createStockForm, locationId: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                >
                  <option value="">Unassigned</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.structural}>
                      {l.pathString} ({l.locationType}) {l.structural ? "[Structural]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={createStockForm.quantity}
                    onChange={(e) =>
                      setCreateStockForm({ ...createStockForm, quantity: e.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Status</label>
                  <select
                    value={createStockForm.status}
                    onChange={(e) =>
                      setCreateStockForm({ ...createStockForm, status: e.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="OK">OK</option>
                    <option value="ATTENTION">ATTENTION</option>
                    <option value="QUARANTINED">QUARANTINED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Batch / Lot Code
                  </label>
                  <input
                    type="text"
                    value={createStockForm.batchCode}
                    onChange={(e) =>
                      setCreateStockForm({ ...createStockForm, batchCode: e.target.value })
                    }
                    placeholder="LOT-2026-11"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Serial Number (Trackable only)
                  </label>
                  <input
                    type="text"
                    value={createStockForm.serialNumber}
                    onChange={(e) =>
                      setCreateStockForm({ ...createStockForm, serialNumber: e.target.value })
                    }
                    placeholder="SN-0001"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateStock(false)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  Create Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Location Create / Edit / Move */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">
                {showLocationModal.mode === "create"
                  ? "New Storage Location"
                  : showLocationModal.mode === "edit"
                    ? `Edit Location · ${showLocationModal.location?.name}`
                    : `Move Subtree · ${showLocationModal.location?.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setShowLocationModal(null)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="mt-4 space-y-3">
              {locError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {locError}
                </div>
              )}

              {showLocationModal.mode !== "move" && (
                <>
                  <div>
                    <label className="block text-[12px] font-medium text-[#18181B]">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={locName}
                      onChange={(e) => setLocName(e.target.value)}
                      placeholder="Bin A-01"
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#18181B]">
                        Location Type
                      </label>
                      <select
                        value={locType}
                        onChange={(e) => setLocType(e.target.value)}
                        className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                      >
                        <option value="WAREHOUSE">WAREHOUSE</option>
                        <option value="ROOM">ROOM</option>
                        <option value="AISLE">AISLE</option>
                        <option value="RACK">RACK</option>
                        <option value="SHELF">SHELF</option>
                        <option value="BIN">BIN</option>
                        <option value="QUARANTINE">QUARANTINE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#18181B]">
                        Custom Barcode
                      </label>
                      <input
                        type="text"
                        value={locBarcode}
                        onChange={(e) => setLocBarcode(e.target.value)}
                        placeholder="LOC-A01"
                        className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] p-2.5 text-[12px]">
                    <input
                      type="checkbox"
                      checked={locStructural}
                      onChange={(e) => setLocStructural(e.target.checked)}
                    />
                    <span>
                      <strong>Structural location</strong> (cannot hold stock items directly)
                    </span>
                  </label>
                </>
              )}

              {(showLocationModal.mode === "create" || showLocationModal.mode === "move") && (
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Parent Location
                  </label>
                  <select
                    value={locParentId}
                    onChange={(e) => setLocParentId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="">(Root level)</option>
                    {locations
                      .filter((l) => l.id !== showLocationModal.location?.id)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.pathString}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(null)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer / Count / Split / Serialize */}
      {opModal && opModal.type !== "inspect" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">
                {opModal.type === "transfer"
                  ? "Transfer Stock (Auto-splits if partial)"
                  : opModal.type === "adjust"
                    ? "Stocktake Count / Add / Remove"
                    : opModal.type === "split"
                      ? "Split Stock Batch"
                      : "Serialize Batch into Tracked Units"}
              </h2>
              <button
                type="button"
                onClick={() => setOpModal(null)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRunStockOperation} className="mt-4 space-y-3">
              {opError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {opError}
                </div>
              )}

              <div className="rounded-[8px] bg-[#F7F7F8] p-2.5 text-[12px]">
                <div className="font-mono font-semibold text-[#18181B]">
                  {opModal.item.partIpn} — {opModal.item.partName}
                </div>
                <div className="text-[#52525B]">
                  Current Qty: {opModal.item.quantity} {opModal.item.partUnit} ·{" "}
                  {opModal.item.locationPathString ?? "Unassigned"}
                </div>
              </div>

              {opModal.type === "adjust" && (
                <div className="flex gap-1.5">
                  {(["count", "add", "remove"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOpModal({ ...opModal, mode: m })}
                      className={`flex-1 rounded-[8px] border py-1.5 text-[12px] font-medium capitalize ${
                        opModal.mode === m
                          ? "border-[#1D4ED8] bg-[#EEF2FF] text-[#1D4ED8]"
                          : "border-[#E4E4E7] bg-white text-[#52525B]"
                      }`}
                    >
                      {m === "count" ? "Set Count (=)" : m === "add" ? "Add (+)" : "Remove (−)"}
                    </button>
                  ))}
                </div>
              )}

              {opModal.type !== "serialize" ? (
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={opQty}
                    onChange={(e) => setOpQty(e.target.value)}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Serial Numbers (comma or newline separated) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={opSerialsText}
                    onChange={(e) => setOpSerialsText(e.target.value)}
                    placeholder="SN-001, SN-002, SN-003"
                    className="mt-1 w-full rounded-[8px] border border-[#E4E4E7] p-2.5 font-mono text-[12px]"
                  />
                </div>
              )}

              {(opModal.type === "transfer" ||
                opModal.type === "split" ||
                opModal.type === "serialize") && (
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Destination Location
                  </label>
                  <select
                    required={opModal.type === "transfer"}
                    value={opTargetLocId}
                    onChange={(e) => setOpTargetLocId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="">Select destination bin…</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id} disabled={l.structural}>
                        {l.pathString} {l.structural ? "[Structural]" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">Notes</label>
                <input
                  type="text"
                  value={opNotes}
                  onChange={(e) => setOpNotes(e.target.value)}
                  placeholder="Audit note for StockItemTracking ledger"
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setOpModal(null)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Stock History Timeline, ZXing QR Barcode & Quality Tests */}
      {opModal && opModal.type === "inspect" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#18181B]">
                  Stock Ledger & Quality Inspection · {opModal.item.partIpn}
                </h2>
                <p className="font-mono text-[11px] text-[#63636B]">
                  ID: {opModal.item.id} · Qty: {opModal.item.quantity} {opModal.item.partUnit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpModal(null)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ZXing QR Code Preview */}
            <FeatureGate feature="BARCODES">
              <div className="mt-4 flex items-center justify-between rounded-[10px] border border-[#E4E4E7] bg-[#F7F7F8] p-3">
                <div>
                  <div className="text-[13px] font-semibold text-[#18181B]">
                    ZXing QR Label Payload
                  </div>
                  <div className="font-mono text-[12px] text-[#1D4ED8]">
                    IMS:STOCK:{opModal.item.id}
                  </div>
                </div>
                <img
                  src={`/api/v1/barcode/image?code=${encodeURIComponent(`IMS:STOCK:${opModal.item.id}`)}&format=QR_CODE&width=96&height=96`}
                  alt="Stock QR Code"
                  className="h-20 w-20 rounded border border-[#E4E4E7] bg-white p-1"
                />
              </div>
            </FeatureGate>

            {/* Quality Control Tests */}
            <FeatureGate feature="QUALITY_TESTS">
              <div className="mt-5">
                <h3 className="text-[14px] font-semibold text-[#18181B]">
                  Quality Inspection Results ({testResults.length})
                </h3>
                <form onSubmit={handleRecordTestResult} className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="text"
                    required
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    placeholder="Test name (e.g. Visual / Electrical)"
                    className="h-8 flex-1 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
                  />
                  <input
                    type="text"
                    value={newTestValue}
                    onChange={(e) => setNewTestValue(e.target.value)}
                    placeholder="Measured value"
                    className="h-8 w-36 rounded-[8px] border border-[#E4E4E7] px-2.5 font-mono text-[12px]"
                  />
                  <select
                    value={newTestPassed ? "PASS" : "FAIL"}
                    onChange={(e) => setNewTestPassed(e.target.value === "PASS")}
                    className="h-8 rounded-[8px] border border-[#E4E4E7] bg-white px-2 text-[12px]"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                  <button
                    type="submit"
                    className="h-8 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white"
                  >
                    Record
                  </button>
                </form>

                {testResults.length > 0 && (
                  <div className="mt-2 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7] text-[12px]">
                    {testResults.map((tr) => (
                      <div key={tr.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="font-medium text-[#18181B]">{tr.testName}</span>
                          {tr.value && (
                            <span className="ml-2 font-mono text-[#52525B]">({tr.value})</span>
                          )}
                        </div>
                        <StatusBadge
                          label={tr.passed ? "PASS" : "FAIL"}
                          tone={tr.passed ? "success" : "danger"}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>

            {/* StockItemTracking Timeline */}
            <div className="mt-5">
              <h3 className="text-[14px] font-semibold text-[#18181B]">
                Immutable Movement Ledger ({trackingList.length})
              </h3>
              <div className="mt-2 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7]">
                {trackingList.map((trk) => {
                  const sign =
                    trk.quantityDelta > 0 ? "+" : trk.quantityDelta < 0 ? "" : "→";
                  return (
                    <div
                      key={trk.id}
                      className="flex items-center justify-between px-3.5 py-2.5 text-[12px]"
                    >
                      <div>
                        <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#18181B]">
                          {trk.trackingType}
                        </span>
                        {trk.locationPathString && (
                          <span className="ml-2 text-[#52525B]">{trk.locationPathString}</span>
                        )}
                        {trk.notes && <div className="mt-0.5 text-[#63636B]">{trk.notes}</div>}
                      </div>
                      <div className="text-right font-mono">
                        <div
                          className={
                            trk.quantityDelta > 0
                              ? "font-semibold text-[#166534]"
                              : trk.quantityDelta < 0
                                ? "font-semibold text-[#991B1B]"
                                : "text-[#1D4ED8]"
                          }
                        >
                          {sign}
                          {trk.quantityDelta} → {trk.quantityAfter}
                        </div>
                        <div className="text-[10px] text-[#63636B]">
                          {new Date(trk.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unified Barcode Scan Resolver */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">
                Barcode / QR Scan Resolver
              </h2>
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleScanResolve} className="mt-4 space-y-3">
              <input
                type="text"
                autoFocus
                required
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type barcode (e.g. IMS:STOCK:..., LOC-..., or IPN)…"
                className="h-10 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
              />
              <button
                type="submit"
                className="h-9 w-full rounded-[8px] bg-[#1D4ED8] text-[13px] font-medium text-white"
              >
                Resolve Barcode
              </button>
            </form>

            {scanError && (
              <div className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 p-3 text-[12px] text-[#991B1B]">
                {scanError}
              </div>
            )}

            {scanResult && (
              <div className="mt-4 rounded-[10px] border border-[#C7D2FE] bg-[#EEF2FF]/60 p-4">
                <StatusBadge label={scanResult.matchedType} tone="primary" />
                <div className="mt-2 text-[14px] font-semibold text-[#18181B]">
                  {scanResult.title}
                </div>
                <div className="text-[12px] text-[#52525B]">{scanResult.subtitle}</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(false);
                    router.push(scanResult.href);
                  }}
                  className="mt-3 h-8 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white"
                >
                  Open Record →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
