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
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  BulkActionBar,
  Button,
  Card,
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
  ImportWizard,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  StatusBadge,
  Textarea,
  toast,
  toastApiError,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { useEditMode } from "@/lib/edit-mode";
import { EditModeHint } from "@/components/edit-mode-hint";
import { ListToolbar, ListToolbarMenuItem } from "@/components/list-toolbar";
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

function StockAndLocationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLocId = searchParams.get("locationId");
  const initialAddStock = searchParams.get("addStock") === "true";
  const initialPartId = searchParams.get("partId") ?? "";
  const { me, hasPermission, hasFeature, refetch } = useEntitlements();
  const { editMode } = useEditMode();

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
  const [showCreateStock, setShowCreateStock] = useState(initialAddStock);
  const [createStockForm, setCreateStockForm] = useState({
    partId: initialPartId,
    locationId: "",
    quantity: "",
    serialNumber: "",
    batchCode: "",
    status: "",
    customBarcode: "",
    notes: "",
  });
  const [createStockError, setCreateStockError] = useState<string | null>(null);

  // Location Modal
  const [showLocationModal, setShowLocationModal] = useState<
    null | { mode: "create" | "edit" | "move"; location?: LocationView }
  >(null);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<LocationView | null>(null);
  const [confirmMergeOpen, setConfirmMergeOpen] = useState(false);
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
      toast.success("Stock item created");
      await Promise.all([loadStock(), loadMetadata()]);
    } catch (err) {
      setCreateStockError(err instanceof Error ? err.message : "Failed to create stock");
      toastApiError(err, "Failed to create stock");
    }
  }

  async function handleSaveLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!showLocationModal) return;
    setLocError(null);
    const mode = showLocationModal.mode;
    try {
      if (mode === "create") {
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
      } else if (mode === "edit" && showLocationModal.location) {
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
      } else if (mode === "move" && showLocationModal.location) {
        await apiFetch<LocationView>(
          `/api/v1/stock-locations/${showLocationModal.location.id}/move`,
          {
            method: "POST",
            body: JSON.stringify({ newParentId: locParentId || null }),
          }
        );
      }
      setShowLocationModal(null);
      toast.success(
        mode === "create"
          ? "Location created"
          : mode === "edit"
            ? "Location updated"
            : "Location moved",
        { description: mode === "move" ? showLocationModal.location?.name : locName }
      );
      await Promise.all([loadMetadata(), loadStock()]);
      refetch();
    } catch (err) {
      setLocError(err instanceof Error ? err.message : "Location save failed");
      toastApiError(err, "Location save failed");
    }
  }

  async function handleDeleteLocation(loc: LocationView) {
    try {
      await apiFetch<void>(`/api/v1/stock-locations/${loc.id}?mode=REPARENT`, {
        method: "DELETE",
      });
      if (selectedLocationId === loc.id) setSelectedLocationId(null);
      toast.success("Location deleted", { description: loc.name });
      await Promise.all([loadMetadata(), loadStock()]);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete location");
    }
  }

  async function handleRunStockOperation(e: React.FormEvent) {
    e.preventDefault();
    if (!opModal || opModal.type === "inspect") return;
    setOpError(null);
    const modal = opModal;
    try {
      if (modal.type === "transfer") {
        await apiFetch(`/api/v1/stock-items/${modal.item.id}/transfer`, {
          method: "POST",
          body: JSON.stringify({
            targetLocationId: opTargetLocId,
            quantity: Number(opQty),
            notes: opNotes || null,
          }),
        });
      } else if (modal.type === "adjust") {
        await apiFetch(`/api/v1/stock-items/${modal.item.id}/${modal.mode}`, {
          method: "POST",
          body: JSON.stringify({
            quantity: Number(opQty),
            notes: opNotes || null,
          }),
        });
      } else if (modal.type === "split") {
        await apiFetch(`/api/v1/stock-items/${modal.item.id}/split`, {
          method: "POST",
          body: JSON.stringify({
            splitQuantity: Number(opQty),
            targetLocationId: opTargetLocId || null,
            notes: opNotes || null,
          }),
        });
      } else if (modal.type === "serialize") {
        const serials = opSerialsText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        await apiFetch(`/api/v1/stock-items/${modal.item.id}/serialize`, {
          method: "POST",
          body: JSON.stringify({
            serialNumbers: serials,
            targetLocationId: opTargetLocId || null,
            notes: opNotes || null,
          }),
        });
      }
      setOpModal(null);
      const opTitle =
        modal.type === "transfer"
          ? "Stock transferred"
          : modal.type === "split"
            ? "Batch split"
            : modal.type === "serialize"
              ? "Batch serialized"
              : modal.mode === "count"
                ? "Stock count updated"
                : modal.mode === "add"
                  ? "Stock added"
                  : "Stock removed";
      toast.success(opTitle, { description: modal.item.partIpn });
      await Promise.all([loadStock(), loadMetadata()]);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Stock operation failed");
      toastApiError(err, "Stock operation failed");
    }
  }

  async function handleMergeSelected() {
    if (selectedItems.length < 2) return;
    const count = selectedItems.length;
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
      toast.success(`Merged ${count} stock batches`);
      await Promise.all([loadStock(), loadMetadata()]);
    } catch (err) {
      toastApiError(err, "Failed to merge selected batches");
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
      toast.success("Inspection result recorded", {
        description: `${newTestName}: ${newTestPassed ? "PASS" : "FAIL"}`,
      });
      setNewTestName("");
      setNewTestValue("");
      await openInspectModal(opModal.item);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Failed to record test result");
      toastApiError(err, "Failed to record test result");
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
      toast.success("Barcode matched", { description: res.title });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Barcode not recognized");
      toastApiError(err, "Barcode not recognized");
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
      const summary = `${res.driftsFoundAndCorrected} counter drifts corrected`;
      setReconcileBanner(`Reconciled ${res.partsChecked} parts · ${summary}`);
      if (res.driftsFoundAndCorrected > 0) {
        toast.warning(`Reconciled ${res.partsChecked} parts`, { description: summary });
      } else {
        toast.success(`Reconciled ${res.partsChecked} parts`, { description: "No drifts found" });
      }
    } catch (err) {
      toastApiError(err, "Reconciliation failed");
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
              className="font-mono text-[13px] font-medium text-[var(--brand-primary)] hover:underline"
            >
              {row.original.partIpn}
            </Link>
            <div className="max-w-[220px] truncate text-[12px] text-[var(--text-secondary)]">
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
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--bg-muted)] px-2 py-0.5 text-[12px] text-[var(--text-primary)]">
              <MapPin className="h-3 w-3 text-[var(--brand-primary)]" />
              <span>{row.original.locationPathString}</span>
            </span>
          ) : (
            <span className="text-[12px] text-[var(--text-muted)]">Unassigned</span>
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
                <span className="rounded border border-[var(--border-violet)] bg-[var(--status-violet-bg)] px-2 py-0.5 text-[var(--status-violet-fg)]">
                  SN: {item.serialNumber}
                </span>
              )}
              {item.batchCode && (
                <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[var(--text-secondary)]">
                  Batch: {item.batchCode}
                </span>
              )}
              {!item.serialNumber && !item.batchCode && (
                <span className="text-[var(--text-muted)]">—</span>
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
          <div className="text-right font-mono text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">
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
                className="rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
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
                    className="rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
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
                    className="rounded border border-[var(--border-subtle)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
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
                      className="rounded border border-[var(--border-violet)] bg-[var(--status-violet-bg)]/60 px-2 py-1 text-[11px] font-medium text-[var(--status-violet-fg)] hover:bg-[var(--status-violet-bg)]"
                    >
                      Serialize
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => openInspectModal(item)}
                className="inline-flex items-center gap-1 rounded border border-[var(--border-brand)] bg-[var(--brand-tint)] px-2 py-1 text-[11px] font-medium text-[var(--brand-primary)]"
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
      {reconcileBanner && (
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--border-success)] bg-[var(--status-success-bg)]/70 px-4 py-2.5 text-[13px] text-[var(--status-success-fg)]">
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

      {showImporter && (
        <Dialog open={showImporter} onOpenChange={setShowImporter}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Import Stock (CSV / XLSX)</DialogTitle>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      )}

      {/* Split-Pane Layout: Left Warehouse Location Tree + Right Stock Items Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Pane: Locations Tree */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="ims-modal-header">
              <div>
                <div className="text-[14px] font-semibold text-[var(--text-primary)]">Locations</div>
                <div className="text-[11px] text-[var(--text-muted)]">Warehouse / Room / Aisle / Bin</div>
              </div>
              {hasPermission("STOCK:CREATE") && editMode && (
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
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[12px] font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                  <span>New</span>
                </button>
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
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
                    ? "bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Boxes className="h-3.5 w-3.5" />
                  <span>All Locations</span>
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{locations.length}</span>
              </button>

              {locations.map((loc) => {
                const active = selectedLocationId === loc.id;
                const depthPadding = [
                  "pl-0",
                  "pl-3.5",
                  "pl-7",
                  "pl-10",
                  "pl-14",
                  "pl-[70px]",
                  "pl-[84px]",
                ][Math.min(loc.depth, 6)];
                return (
                  <div
                    key={loc.id}
                    className={`flex items-center justify-between rounded-[8px] pr-1 hover:bg-[var(--bg-canvas)] ${depthPadding}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocationId(loc.id);
                        setPageIndex(0);
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-[13px] ${
                        active ? "bg-[var(--brand-tint)] font-semibold text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <MapPin
                          className={`h-3.5 w-3.5 shrink-0 ${
                            loc.structural ? "text-[var(--status-warning-fg)]" : "text-[var(--brand-primary)]"
                          }`}
                        />
                        <span className="truncate">{loc.name}</span>
                        <span className="rounded bg-[var(--bg-muted)] px-1 text-[10px] font-mono text-[var(--text-muted)]">
                          {loc.locationType}
                        </span>
                      </span>
                      <span className="ml-1 font-mono text-[11px] text-[var(--text-muted)]">
                        {loc.directItemCount}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedLocation && (
              <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                <div className="text-[12px] font-medium text-[var(--text-primary)]">
                  {selectedLocation.pathString}
                </div>
                {editMode ? (
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
                      className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] bg-white px-2 text-[11px] font-medium"
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
                      className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] bg-white px-2 text-[11px] font-medium"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Move</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteLocationTarget(selectedLocation)}
                      className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/40 px-2 text-[11px] font-medium text-[var(--status-danger-fg)]"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : (
                  <EditModeHint actionDescription="edit, move, or delete locations" />
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Pane: Stock Filters + DataTable */}
        <div className="space-y-4 lg:col-span-9">
          <ListToolbar
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setPageIndex(0);
            }}
            searchPlaceholder="Search batch code, serial number, or custom barcode…"
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
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="ATTENTION">ATTENTION</SelectItem>
                  <SelectItem value="QUARANTINED">QUARANTINED</SelectItem>
                  <SelectItem value="IN_TRANSIT">IN_TRANSIT</SelectItem>
                  <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                  <SelectItem value="RETURNED">RETURNED</SelectItem>
                </SelectContent>
              </Select>
            }
            menuItems={(() => {
              const items: ListToolbarMenuItem[] = [];
              if (hasFeature("IMPORT_EXPORT")) {
                items.push({
                  key: "import",
                  label: showImporter ? "Hide Importer" : "Import Stock",
                  icon: <FileSpreadsheet className="h-4 w-4 text-[var(--brand-primary)]" />,
                  onClick: () => setShowImporter((v) => !v),
                });
              }
              if (hasFeature("BARCODES")) {
                items.push({
                  key: "scan",
                  label: "Scan Barcode",
                  icon: <QrCode className="h-4 w-4 text-[var(--brand-primary)]" />,
                  onClick: () => {
                    setScanInput("");
                    setScanResult(null);
                    setScanError(null);
                    setShowScanner(true);
                  },
                });
              }
              items.push({
                key: "reconcile",
                label: reconciling ? "Reconciling…" : "Verify & Reconcile",
                icon: (
                  <RefreshCw
                    className={`h-4 w-4 text-[var(--status-success-fg)] ${reconciling ? "animate-spin" : ""}`}
                  />
                ),
                onClick: handleReconcile,
                disabled: reconciling,
              });
              return items;
            })()}
            primaryAction={
              hasPermission("STOCK:CREATE")
                ? {
                    label: "New Stock Item",
                    onClick: () => {
                      setCreateStockError(null);
                      setCreateStockForm({
                        partId: "",
                        locationId: "",
                        quantity: "",
                        serialNumber: "",
                        batchCode: "",
                        status: "",
                        customBarcode: "",
                        notes: "",
                      });
                      setShowCreateStock(true);
                    },
                  }
                : undefined
            }
          />

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
                    onClick={() => {
                      setCreateStockError(null);
                      setCreateStockForm({
                        partId: "",
                        locationId: "",
                        quantity: "",
                        serialNumber: "",
                        batchCode: "",
                        status: "",
                        customBarcode: "",
                        notes: "",
                      });
                      setShowCreateStock(true);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-4 text-[13px] font-medium text-white"
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
          <Button
            type="button"
            size="sm"
            onClick={() => setConfirmMergeOpen(true)}
            className="rounded-full"
          >
            <GitMerge className="h-3.5 w-3.5" />
            <span>Merge {selectedItems.length} Batches</span>
          </Button>
        )}
      </BulkActionBar>

      {/* Dialog: Create Stock Item */}
      <Dialog open={showCreateStock} onOpenChange={setShowCreateStock}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Stock Item</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateStock} className="space-y-3">
            {createStockError && (
              <Alert variant="destructive">
                <AlertDescription>{createStockError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label>Part *</Label>
              <Combobox
                value={createStockForm.partId}
                onValueChange={(val) =>
                  setCreateStockForm({ ...createStockForm, partId: val })
                }
                placeholder="Select part…"
                searchPlaceholder="Search parts by SKU or name…"
                options={parts.map((p) => ({
                  value: p.id,
                  label: `${p.ipn} — ${p.name} (${p.unit}) ${p.trackable ? "[Trackable]" : ""}`,
                }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Storage Location (Non-structural)</Label>
              <Combobox
                value={createStockForm.locationId}
                onValueChange={(val) =>
                  setCreateStockForm({ ...createStockForm, locationId: val })
                }
                placeholder="Unassigned"
                searchPlaceholder="Search locations…"
                options={[
                  { value: "", label: "Unassigned" },
                  ...locations.map((l) => ({
                    value: l.id,
                    label: `${l.pathString} (${l.locationType}) ${l.structural ? "[Structural]" : ""}`,
                    disabled: l.structural,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={createStockForm.quantity}
                  onChange={(e) =>
                    setCreateStockForm({ ...createStockForm, quantity: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={createStockForm.status || "__default__"}
                  onValueChange={(val) =>
                    setCreateStockForm({
                      ...createStockForm,
                      status: val === "__default__" ? "" : val,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Select status…</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="ATTENTION">ATTENTION</SelectItem>
                    <SelectItem value="QUARANTINED">QUARANTINED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Batch / Lot Code</Label>
                <Input
                  type="text"
                  value={createStockForm.batchCode}
                  onChange={(e) =>
                    setCreateStockForm({ ...createStockForm, batchCode: e.target.value })
                  }
                  placeholder="LOT-2026-11"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Serial Number (Trackable only)</Label>
                <Input
                  type="text"
                  value={createStockForm.serialNumber}
                  onChange={(e) =>
                    setCreateStockForm({ ...createStockForm, serialNumber: e.target.value })
                  }
                  placeholder="SN-0001"
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateStock(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!createStockForm.partId}>
                Create Stock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Location Create / Edit / Move */}
      <Dialog
        open={Boolean(showLocationModal)}
        onOpenChange={(open) => !open && setShowLocationModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showLocationModal?.mode === "create"
                ? "New Storage Location"
                : showLocationModal?.mode === "edit"
                  ? `Edit Location · ${showLocationModal?.location?.name}`
                  : `Move Subtree · ${showLocationModal?.location?.name}`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLocation} className="space-y-3">
            {locError && (
              <Alert variant="destructive">
                <AlertDescription>{locError}</AlertDescription>
              </Alert>
            )}

            {showLocationModal?.mode !== "move" && (
              <>
                <div className="space-y-1">
                  <Label>Location Name *</Label>
                  <Input
                    type="text"
                    required
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="Bin A-01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Location Type</Label>
                    <Select value={locType} onValueChange={setLocType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WAREHOUSE">WAREHOUSE</SelectItem>
                        <SelectItem value="ROOM">ROOM</SelectItem>
                        <SelectItem value="AISLE">AISLE</SelectItem>
                        <SelectItem value="RACK">RACK</SelectItem>
                        <SelectItem value="SHELF">SHELF</SelectItem>
                        <SelectItem value="BIN">BIN</SelectItem>
                        <SelectItem value="QUARANTINE">QUARANTINE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Custom Barcode</Label>
                    <Input
                      type="text"
                      value={locBarcode}
                      onChange={(e) => setLocBarcode(e.target.value)}
                      placeholder="LOC-A01"
                      className="font-mono"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border p-2.5 text-[12px]">
                  <Checkbox
                    checked={locStructural}
                    onCheckedChange={(v) => setLocStructural(Boolean(v))}
                  />
                  <span>
                    <strong>Structural location</strong> (cannot hold stock items directly)
                  </span>
                </label>
              </>
            )}

            {(showLocationModal?.mode === "create" || showLocationModal?.mode === "move") && (
              <div className="space-y-1">
                <Label>Parent Location</Label>
                <Combobox
                  value={locParentId}
                  onValueChange={setLocParentId}
                  placeholder="(Root level)"
                  searchPlaceholder="Search parent locations…"
                  options={[
                    { value: "", label: "(Root level)" },
                    ...locations
                      .filter((l) => l.id !== showLocationModal?.location?.id)
                      .map((l) => ({ value: l.id, label: l.pathString })),
                  ]}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Transfer / Count / Split / Serialize */}
      <Dialog
        open={Boolean(opModal && opModal.type !== "inspect")}
        onOpenChange={(open) => !open && setOpModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {opModal?.type === "transfer"
                ? "Transfer Stock (Auto-splits if partial)"
                : opModal?.type === "adjust"
                  ? "Stocktake Count / Add / Remove"
                  : opModal?.type === "split"
                    ? "Split Stock Batch"
                    : "Serialize Batch into Tracked Units"}
            </DialogTitle>
          </DialogHeader>

          {opModal && opModal.type !== "inspect" && (
            <form onSubmit={handleRunStockOperation} className="space-y-3">
              {opError && (
                <Alert variant="destructive">
                  <AlertDescription>{opError}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-[8px] bg-background p-2.5 text-[12px]">
                <div className="font-mono font-semibold text-foreground">
                  {opModal.item.partIpn} — {opModal.item.partName}
                </div>
                <div className="text-muted-foreground">
                  Current Qty: {opModal.item.quantity} {opModal.item.partUnit} ·{" "}
                  {opModal.item.locationPathString ?? "Unassigned"}
                </div>
              </div>

              {opModal.type === "adjust" && (
                <div className="flex gap-1.5">
                  {(["count", "add", "remove"] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={opModal.mode === m ? "default" : "outline"}
                      onClick={() => setOpModal({ ...opModal, mode: m })}
                      className="flex-1"
                    >
                      {m === "count" ? "Set Count (=)" : m === "add" ? "Add (+)" : "Remove (−)"}
                    </Button>
                  ))}
                </div>
              )}

              {opModal.type !== "serialize" ? (
                <div className="space-y-1">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    step="any"
                    required
                    value={opQty}
                    onChange={(e) => setOpQty(e.target.value)}
                    className="font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Serial Numbers (comma or newline separated) *</Label>
                  <Textarea
                    rows={3}
                    required
                    value={opSerialsText}
                    onChange={(e) => setOpSerialsText(e.target.value)}
                    placeholder="SN-001, SN-002, SN-003"
                    className="font-mono text-[12px]"
                  />
                </div>
              )}

              {(opModal.type === "transfer" ||
                opModal.type === "split" ||
                opModal.type === "serialize") && (
                <div className="space-y-1">
                  <Label>Destination Location</Label>
                  <Combobox
                    value={opTargetLocId}
                    onValueChange={setOpTargetLocId}
                    placeholder="Select destination bin…"
                    searchPlaceholder="Search bins…"
                    options={locations.map((l) => ({
                      value: l.id,
                      label: `${l.pathString} ${l.structural ? "[Structural]" : ""}`,
                      disabled: l.structural,
                    }))}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  type="text"
                  value={opNotes}
                  onChange={(e) => setOpNotes(e.target.value)}
                  placeholder="Audit note for StockItemTracking ledger"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpModal(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Confirm</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet Drawer: Stock History Timeline, ZXing QR Barcode & Quality Tests */}
      <Sheet
        open={Boolean(opModal && opModal.type === "inspect")}
        onOpenChange={(open) => !open && setOpModal(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          {opModal && opModal.type === "inspect" && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Stock Ledger &amp; Quality Inspection · {opModal.item.partIpn}
                </SheetTitle>
                <SheetDescription className="font-mono text-[11px]">
                  ID: {opModal.item.id} · Qty: {opModal.item.quantity} {opModal.item.partUnit}
                </SheetDescription>
              </SheetHeader>

              {/* ZXing QR Code Preview */}
              <FeatureGate feature="BARCODES">
                <div className="flex items-center justify-between rounded-[10px] border border-border bg-background p-3">
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">
                      ZXing QR Label Payload
                    </div>
                    <div className="font-mono text-[12px] text-primary">
                      IMS:STOCK:{opModal.item.id}
                    </div>
                  </div>
                  <img
                    src={`/api/v1/barcode/image?code=${encodeURIComponent(`IMS:STOCK:${opModal.item.id}`)}&format=QR_CODE&width=96&height=96`}
                    alt="Stock QR Code"
                    className="h-20 w-20 rounded border border-border bg-card p-1"
                  />
                </div>
              </FeatureGate>

              {/* Quality Control Tests */}
              <FeatureGate feature="QUALITY_TESTS">
                <div className="space-y-2">
                  <h3 className="text-[14px] font-semibold text-foreground">
                    Quality Inspection Results ({testResults.length})
                  </h3>
                  <form onSubmit={handleRecordTestResult} className="flex flex-wrap gap-2">
                    <Input
                      type="text"
                      required
                      value={newTestName}
                      onChange={(e) => setNewTestName(e.target.value)}
                      placeholder="Test name (e.g. Visual / Electrical)"
                      className="h-8 flex-1 text-[12px]"
                    />
                    <Input
                      type="text"
                      value={newTestValue}
                      onChange={(e) => setNewTestValue(e.target.value)}
                      placeholder="Measured value"
                      className="h-8 w-36 font-mono text-[12px]"
                    />
                    <Select
                      value={newTestPassed ? "PASS" : "FAIL"}
                      onValueChange={(val) => setNewTestPassed(val === "PASS")}
                    >
                      <SelectTrigger className="h-8 w-24 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASS">PASS</SelectItem>
                        <SelectItem value="FAIL">FAIL</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" size="sm">
                      Record
                    </Button>
                  </form>

                  {testResults.length > 0 && (
                    <div className="divide-y divide-border rounded-[8px] border border-border text-[12px]">
                      {testResults.map((tr) => (
                        <div key={tr.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <span className="font-medium text-foreground">{tr.testName}</span>
                            {tr.value && (
                              <span className="ml-2 font-mono text-muted-foreground">({tr.value})</span>
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
              <div className="space-y-2">
                <h3 className="text-[14px] font-semibold text-foreground">
                  Immutable Movement Ledger ({trackingList.length})
                </h3>
                <div className="divide-y divide-border rounded-[8px] border border-border">
                  {trackingList.map((trk) => {
                    const sign =
                      trk.quantityDelta > 0 ? "+" : trk.quantityDelta < 0 ? "" : "→";
                    return (
                      <div
                        key={trk.id}
                        className="flex items-center justify-between px-3.5 py-2.5 text-[12px]"
                      >
                        <div>
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                            {trk.trackingType}
                          </span>
                          {trk.locationPathString && (
                            <span className="ml-2 text-muted-foreground">{trk.locationPathString}</span>
                          )}
                          {trk.notes && <div className="mt-0.5 text-muted-foreground">{trk.notes}</div>}
                        </div>
                        <div className="text-right font-mono">
                          <div
                            className={
                              trk.quantityDelta > 0
                                ? "font-semibold text-[var(--status-success-fg)]"
                                : trk.quantityDelta < 0
                                  ? "font-semibold text-[var(--status-danger-fg)]"
                                  : "text-primary"
                            }
                          >
                            {sign}
                            {trk.quantityDelta} → {trk.quantityAfter}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(trk.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: Unified Barcode Scan Resolver */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Barcode / QR Scan Resolver</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleScanResolve} className="space-y-3">
            <Input
              type="text"
              autoFocus
              required
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan or type barcode (e.g. IMS:STOCK:..., LOC-..., or IPN)…"
              className="h-10 font-mono"
            />
            <Button type="submit" className="w-full">
              Resolve Barcode
            </Button>
          </form>

          {scanError && (
            <Alert variant="destructive">
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}

          {scanResult && (
            <div className="rounded-[10px] border border-[var(--border-brand)] bg-accent/60 p-4">
              <StatusBadge label={scanResult.matchedType} tone="primary" />
              <div className="mt-2 text-[14px] font-semibold text-foreground">
                {scanResult.title}
              </div>
              <div className="text-[12px] text-muted-foreground">{scanResult.subtitle}</div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowScanner(false);
                  router.push(scanResult.href);
                }}
                className="mt-3"
              >
                Open Record →
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Location */}
      <AlertDialog
        open={Boolean(deleteLocationTarget)}
        onOpenChange={(open) => !open && setDeleteLocationTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete storage location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteLocationTarget?.name}</strong>? Child
              locations and stock items will be reparented.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteLocationTarget) {
                  handleDeleteLocation(deleteLocationTarget);
                  setDeleteLocationTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Merge Batches */}
      <AlertDialog open={confirmMergeOpen} onOpenChange={setConfirmMergeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge {selectedItems.length} stock batches?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected stock lots will be combined into a single lot at{" "}
              <strong className="text-foreground">
                {selectedItems[0]?.locationPathString ?? "the primary location"}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmMergeOpen(false);
                handleMergeSelected();
              }}
            >
              Merge Batches
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function StockAndLocationsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading stock...</div>}>
      <StockAndLocationsPageContent />
    </React.Suspense>
  );
}
