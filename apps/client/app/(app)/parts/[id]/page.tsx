"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  apiFetch,
  AttachmentView,
  BomItemView,
  CategoryView,
  CompanyView,
  LocationView,
  ManufacturerPartView,
  NoteView,
  PageResponse,
  ParameterTemplateView,
  PartView,
  StockItemView,
  StockSummaryView,
  StockTrackingView,
  SupplierPartView,
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
  Button,
  Card,
  Checkbox,
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  Modal,
  Skeleton,
  StatTile,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
  toastApiError,
} from "@ims/ui";
import { useEntitlements } from "@/lib/entitlements";
import { useEditMode } from "@/lib/edit-mode";
import { CurrencySelect } from "@/components/currency-select";
import { EditModeHint } from "@/components/edit-mode-hint";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  DollarSign,
  Edit3,
  FileText,
  History,
  Layers,
  MapPin,
  Minus,
  Package,
  Paperclip,
  Plus,
  Printer,
  QrCode,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";

type DetailTab =
  | "overview"
  | "locations"
  | "activity"
  | "specs"
  | "kit"
  | "suppliers"
  | "variants"
  | "notes";

type StockOpModal =
  | null
  | { type: "add" | "remove" | "count" | "transfer"; item: StockItemView };

function readMetaString(meta: Record<string, unknown> | undefined, key: string, fallback = ""): string {
  const val = meta?.[key];
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return fallback;
}

function readMetaNumber(meta: Record<string, unknown> | undefined, key: string): number | null {
  const val = meta?.[key];
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export default function PartDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const partId = params.id;
  const { hasPermission, hasFeature } = useEntitlements();
  const { editMode } = useEditMode();

  const [part, setPart] = useState<PartView | null>(null);
  const [parentPart, setParentPart] = useState<PartView | null>(null);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [templates, setTemplates] = useState<ParameterTemplateView[]>([]);
  const [variants, setVariants] = useState<PartView[]>([]);
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummaryView | null>(null);
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [trackingHistory, setTrackingHistory] = useState<StockTrackingView[]>([]);
  const [supplierParts, setSupplierParts] = useState<SupplierPartView[]>([]);
  const [suppliers, setSuppliers] = useState<CompanyView[]>([]);
  const [manufacturerParts, setManufacturerParts] = useState<ManufacturerPartView[]>([]);
  const [bomItems, setBomItems] = useState<BomItemView[]>([]);
  const [whereUsed, setWhereUsed] = useState<BomItemView[]>([]);
  const [allParts, setAllParts] = useState<PartView[]>([]);

  // Add Supplier / Price Break modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    supplierId: "",
    sku: "",
    packQuantity: "1",
    moq: "1",
    leadTimeDays: "",
    unitPrice: "",
    currency: "USD",
  });
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [priceBreakTarget, setPriceBreakTarget] = useState<SupplierPartView | null>(null);
  const [pbForm, setPbForm] = useState({ minQuantity: "1", unitPrice: "", currency: "USD" });
  const [pbError, setPbError] = useState<string | null>(null);
  const [savingPb, setSavingPb] = useState(false);

  const [bomSubPartId, setBomSubPartId] = useState("");
  const [bomQuantity, setBomQuantity] = useState("1");
  const [bomError, setBomError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Update Specification state
  const [paramName, setParamName] = useState("");
  const [paramValue, setParamValue] = useState("");
  const [paramError, setParamError] = useState<string | null>(null);
  const [savingParam, setSavingParam] = useState(false);

  // Variant creation modal
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantSku, setVariantSku] = useState("");
  const [variantName, setVariantName] = useState("");
  const [variantError, setVariantError] = useState<string | null>(null);

  // Edit Item modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    ipn: "",
    name: "",
    description: "",
    categoryId: "",
    unit: "pcs",
    minimumStock: "0",
    costPrice: "",
    sellingPrice: "",
    taxRate: "",
    currency: "USD",
    barcode: "",
    active: true,
    assembly: false,
    trackable: false,
    purchaseable: true,
    salable: true,
    virtual: false,
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Quick Stock Operation Modal
  const [stockOp, setStockOp] = useState<StockOpModal>(null);
  const [opQty, setOpQty] = useState("1");
  const [opLocationId, setOpLocationId] = useState("");
  const [opNotes, setOpNotes] = useState("");
  const [opError, setOpError] = useState<string | null>(null);
  const [opSaving, setOpSaving] = useState(false);

  // Notes & Files
  const [noteContent, setNoteContent] = useState("");
  const [attachmentFileName, setAttachmentFileName] = useState("");
  const [attachmentComment, setAttachmentComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<
    null | { type: "param" | "bom" | "note"; id: string; label: string }
  >(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        p,
        cats,
        locs,
        tpls,
        vars,
        nts,
        atts,
        summary,
        itemsPage,
        sps,
        mps,
        bom,
        wu,
        partsPage,
        suppliersPage,
      ] = await Promise.all([
        apiFetch<PartView>(`/api/v1/parts/${partId}`),
        apiFetch<CategoryView[]>("/api/v1/part-categories"),
        apiFetch<LocationView[]>("/api/v1/stock-locations").catch(() => []),
        apiFetch<ParameterTemplateView[]>("/api/v1/parameter-templates"),
        apiFetch<PartView[]>(`/api/v1/parts/${partId}/variants`),
        apiFetch<NoteView[]>(`/api/v1/notes?entityType=Part&entityId=${partId}`),
        apiFetch<AttachmentView[]>(`/api/v1/attachments?entityType=Part&entityId=${partId}`),
        apiFetch<StockSummaryView>(`/api/v1/parts/${partId}/stock-summary`).catch(() => null),
        apiFetch<PageResponse<StockItemView>>(`/api/v1/stock-items?partId=${partId}&size=100`).catch(() => ({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 100,
        })),
        apiFetch<SupplierPartView[]>(`/api/v1/parts/${partId}/supplier-parts`).catch(() => []),
        apiFetch<ManufacturerPartView[]>(`/api/v1/parts/${partId}/manufacturer-parts`).catch(() => []),
        apiFetch<BomItemView[]>(`/api/v1/parts/${partId}/bom`).catch(() => []),
        apiFetch<BomItemView[]>(`/api/v1/parts/${partId}/where-used`).catch(() => []),
        apiFetch<PageResponse<PartView>>("/api/v1/parts?size=200").catch(() => ({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 200,
        })),
        apiFetch<PageResponse<CompanyView>>("/api/v1/companies?supplier=true&size=200").catch(() => ({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 200,
        })),
      ]);

      setPart(p);
      setCategories(cats);
      setLocations(locs);
      setTemplates(tpls);
      setVariants(vars);
      setNotes(nts);
      setAttachments(atts);
      setStockSummary(summary);
      setStockItems(itemsPage.content);
      setSupplierParts(sps);
      setManufacturerParts(mps);
      setBomItems(bom);
      setWhereUsed(wu);
      setAllParts(partsPage.content);
      setSuppliers(suppliersPage.content);

      if (p.variantOfId) {
        const fromList = partsPage.content.find((item) => item.id === p.variantOfId);
        if (fromList) {
          setParentPart(fromList);
        } else {
          const fetchedParent = await apiFetch<PartView>(`/api/v1/parts/${p.variantOfId}`).catch(() => null);
          setParentPart(fetchedParent);
        }
      } else {
        setParentPart(null);
      }

      // Load stock movement history across up to 5 recent stock lots for this item
      if (itemsPage.content.length > 0) {
        const trackingLists = await Promise.all(
          itemsPage.content.slice(0, 5).map((item) =>
            apiFetch<StockTrackingView[]>(`/api/v1/stock-items/${item.id}/tracking`).catch(() => [])
          )
        );
        const merged = trackingLists
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTrackingHistory(merged);
      } else {
        setTrackingHistory([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load item details");
    } finally {
      setLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const costPrice = useMemo(() => readMetaNumber(part?.metadata, "costPrice"), [part]);
  const sellingPrice = useMemo(() => readMetaNumber(part?.metadata, "sellingPrice"), [part]);
  const taxRate = useMemo(() => readMetaNumber(part?.metadata, "taxRate"), [part]);
  const currency = useMemo(() => readMetaString(part?.metadata, "currency", "USD"), [part]);
  const barcodeValue = useMemo(
    () => readMetaString(part?.metadata, "barcode", part?.ipn ?? ""),
    [part]
  );

  const grossMarginPct = useMemo(() => {
    if (sellingPrice === null || sellingPrice <= 0 || costPrice === null) return null;
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  }, [costPrice, sellingPrice]);

  const isLowStock = useMemo(() => {
    if (!part || !stockSummary) return false;
    return Number(part.minimumStock) > 0 && Number(stockSummary.inStock) <= Number(part.minimumStock);
  }, [part, stockSummary]);

  const reservedStock = useMemo(() => {
    if (!stockSummary) return 0;
    return Number(stockSummary.allocatedToSales ?? 0) + Number(stockSummary.allocatedToBuilds ?? 0);
  }, [stockSummary]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!part) return;
    setEditError(null);
    try {
      const nextMetadata: Record<string, unknown> = { ...(part.metadata ?? {}) };
      if (editForm.costPrice.trim() !== "") nextMetadata.costPrice = Number(editForm.costPrice);
      else delete nextMetadata.costPrice;

      if (editForm.sellingPrice.trim() !== "") nextMetadata.sellingPrice = Number(editForm.sellingPrice);
      else delete nextMetadata.sellingPrice;

      if (editForm.taxRate.trim() !== "") nextMetadata.taxRate = Number(editForm.taxRate);
      else delete nextMetadata.taxRate;

      nextMetadata.currency = editForm.currency || "USD";
      if (editForm.barcode.trim() !== "") nextMetadata.barcode = editForm.barcode.trim();
      else delete nextMetadata.barcode;

      const updated = await apiFetch<PartView>(`/api/v1/parts/${part.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ipn: editForm.ipn,
          name: editForm.name,
          description: editForm.description,
          categoryId: editForm.categoryId || null,
          unit: editForm.unit,
          minimumStock: Number(editForm.minimumStock || 0),
          active: editForm.active,
          assembly: editForm.assembly,
          trackable: editForm.trackable,
          purchaseable: editForm.purchaseable,
          salable: editForm.salable,
          virtual: editForm.virtual,
          metadata: nextMetadata,
        }),
      });
      setPart(updated);
      setShowEditModal(false);
      toast.success("Item updated", { description: `${updated.ipn} saved` });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update item");
      toastApiError(err, "Failed to update item");
    }
  }

  async function handleRunStockOp(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !stockOp) return;
    setOpError(null);
    setOpSaving(true);
    const opType = stockOp.type;
    try {
      if (opType === "transfer") {
        await apiFetch(`/api/v1/stock-items/${stockOp.item.id}/transfer`, {
          method: "POST",
          body: JSON.stringify({
            targetLocationId: opLocationId,
            quantity: Number(opQty),
            notes: opNotes || null,
          }),
        });
      } else {
        await apiFetch(`/api/v1/stock-items/${stockOp.item.id}/${opType}`, {
          method: "POST",
          body: JSON.stringify({
            quantity: Number(opQty),
            notes: opNotes || null,
          }),
        });
      }
      setStockOp(null);
      toast.success(
        opType === "add"
          ? "Stock added"
          : opType === "remove"
            ? "Stock removed"
            : opType === "count"
              ? "Stock count updated"
              : "Stock moved",
        { description: `${opQty} ${part.unit} (${part.ipn})` }
      );
      await loadAll();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Stock operation failed");
      toastApiError(err, "Stock operation failed");
    } finally {
      setOpSaving(false);
    }
  }

  async function handleUpsertParameter(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = paramName.trim();
    if (!part || !trimmedName) return;
    setParamError(null);
    setSavingParam(true);
    try {
      const matchedTemplate = templates.find(
        (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      await apiFetch(`/api/v1/parts/${part.id}/parameters`, {
        method: "POST",
        body: JSON.stringify(
          matchedTemplate
            ? { templateId: matchedTemplate.id, value: paramValue }
            : { name: trimmedName, value: paramValue }
        ),
      });
      setParamName("");
      setParamValue("");
      toast.success("Specification saved");
      await loadAll();
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Failed to save specification");
      toastApiError(err, "Failed to save specification");
    } finally {
      setSavingParam(false);
    }
  }

  async function handleDeleteParameter(parameterId: string) {
    if (!part) return;
    try {
      await apiFetch<void>(`/api/v1/parts/${part.id}/parameters/${parameterId}`, {
        method: "DELETE",
      });
      toast.success("Specification removed");
      await loadAll();
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Failed to remove specification");
      toastApiError(err, "Failed to remove specification");
    }
  }

  async function handleCreateVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!part) return;
    setVariantError(null);
    try {
      const created = await apiFetch<PartView>("/api/v1/parts", {
        method: "POST",
        body: JSON.stringify({
          ipn: variantSku,
          name: variantName,
          description: part.description,
          categoryId: part.categoryId,
          revision: part.revision || "A",
          variantOfId: part.id,
          unit: part.unit,
          minimumStock: part.minimumStock,
          assembly: part.assembly,
          component: part.component,
          trackable: part.trackable,
          purchaseable: part.purchaseable,
          salable: part.salable,
          virtual: part.virtual,
          metadata: part.metadata,
        }),
      });
      setShowVariantModal(false);
      toast.success("Variant created", { description: created.ipn });
      router.push(`/parts/${created.id}`);
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : "Failed to create variant");
      toastApiError(err, "Failed to create variant");
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !noteContent.trim()) return;
    try {
      await apiFetch<NoteView>("/api/v1/notes", {
        method: "POST",
        body: JSON.stringify({
          entityType: "Part",
          entityId: part.id,
          content: noteContent.trim(),
        }),
      });
      setNoteContent("");
      toast.success("Note added");
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to add note");
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await apiFetch<void>(`/api/v1/notes/${noteId}`, { method: "DELETE" });
      toast.success("Note deleted");
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to delete note");
    }
  }

  async function handleCreateAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !attachmentFileName.trim()) return;
    try {
      const res = await apiFetch<{ attachment: AttachmentView; uploadUrl: string }>(
        "/api/v1/attachments/upload-url",
        {
          method: "POST",
          body: JSON.stringify({
            entityType: "Part",
            entityId: part.id,
            fileName: attachmentFileName.trim(),
            contentType: "application/pdf",
            sizeBytes: 24576,
            comment: attachmentComment || null,
          }),
        }
      );
      await apiFetch(`/api/v1/attachments/${res.attachment.id}/complete`, { method: "POST" });
      const fileName = attachmentFileName.trim();
      setAttachmentFileName("");
      setAttachmentComment("");
      toast.success("File attached", { description: fileName });
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to attach file");
    }
  }

  async function handleCreateSupplierPart(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !supplierForm.supplierId || !supplierForm.sku.trim()) return;
    setSupplierError(null);
    setSavingSupplier(true);
    try {
      const created = await apiFetch<SupplierPartView>("/api/v1/supplier-parts", {
        method: "POST",
        body: JSON.stringify({
          partId: part.id,
          supplierId: supplierForm.supplierId,
          sku: supplierForm.sku.trim(),
          packQuantity: Number(supplierForm.packQuantity || 1),
          moq: Number(supplierForm.moq || 1),
          multiple: 1,
          leadTimeDays: supplierForm.leadTimeDays.trim() ? Number(supplierForm.leadTimeDays) : null,
          currency: supplierForm.currency.trim() || currency || "USD",
        }),
      });
      if (supplierForm.unitPrice.trim() !== "") {
        await apiFetch(`/api/v1/supplier-parts/${created.id}/price-breaks`, {
          method: "POST",
          body: JSON.stringify({
            minQuantity: Number(supplierForm.moq || 1),
            unitPrice: Number(supplierForm.unitPrice),
            currency: supplierForm.currency.trim() || currency || "USD",
          }),
        });
      }
      setShowAddSupplierModal(false);
      toast.success("Supplier linked", { description: created.sku });
      await loadAll();
    } catch (err) {
      setSupplierError(err instanceof Error ? err.message : "Failed to link supplier");
      toastApiError(err, "Failed to link supplier");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleAddPriceBreak(e: React.FormEvent) {
    e.preventDefault();
    if (!priceBreakTarget || pbForm.unitPrice.trim() === "") return;
    setPbError(null);
    setSavingPb(true);
    try {
      await apiFetch(`/api/v1/supplier-parts/${priceBreakTarget.id}/price-breaks`, {
        method: "POST",
        body: JSON.stringify({
          minQuantity: Number(pbForm.minQuantity || 1),
          unitPrice: Number(pbForm.unitPrice),
          currency: pbForm.currency.trim() || priceBreakTarget.currency || "USD",
        }),
      });
      setPriceBreakTarget(null);
      toast.success("Price break saved");
      await loadAll();
    } catch (err) {
      setPbError(err instanceof Error ? err.message : "Failed to save price break");
      toastApiError(err, "Failed to save price break");
    } finally {
      setSavingPb(false);
    }
  }

  async function handleDeletePriceBreak(supplierPartId: string, priceBreakId: string) {
    try {
      await apiFetch<void>(`/api/v1/supplier-parts/${supplierPartId}/price-breaks/${priceBreakId}`, {
        method: "DELETE",
      });
      toast.success("Price break removed");
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to remove price break");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-[12px]" />
      </div>
    );
  }

  if (error || !part) {
    return <ErrorState message={error ?? "Item not found"} onRetry={loadAll} />;
  }

  const itemTypeLabel = part.virtual
    ? "Service / Non-Physical"
    : part.assembly
      ? "Kit / Bundle"
      : "Standard Item";

  const tabs: Array<{ id: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "Overview", icon: Package },
    { id: "locations", label: `Stock & Locations (${stockItems.length})`, icon: MapPin },
    { id: "activity", label: `Stock History (${trackingHistory.length})`, icon: History },
    { id: "suppliers", label: `Suppliers (${supplierParts.length})`, icon: Building2 },
    { id: "specs", label: `Specs (${part.parameters.length})`, icon: SlidersHorizontal },
    ...(part.assembly || bomItems.length > 0 || whereUsed.length > 0
      ? [{ id: "kit" as DetailTab, label: `Kit / Bundle (${bomItems.length})`, icon: Layers }]
      : []),
    { id: "variants", label: `Variants (${variants.length})`, icon: Layers },
    { id: "notes", label: `Notes & Files (${notes.length + attachments.length})`, icon: Paperclip },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/parts"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Items</span>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="rounded-[8px] border border-[var(--border-brand)] bg-[var(--brand-tint)] px-2.5 py-1 font-mono text-[14px] font-semibold text-[var(--brand-primary)]">
              {part.ipn}
            </span>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
              {part.name}
            </h1>
            <StatusBadge
              label={part.active ? "Active" : "Inactive"}
              tone={part.active ? "success" : "neutral"}
            />
            <span className="rounded border border-[var(--border-subtle)] bg-white px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">
              {itemTypeLabel}
            </span>
            {part.categoryPathString && (
              <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">
                {part.categoryPathString}
              </span>
            )}
            {parentPart && (
              <Link
                href={`/parts/${parentPart.id}`}
                className="inline-flex items-center gap-1 rounded border border-[var(--border-brand)] bg-[var(--brand-tint)] px-2 py-0.5 text-[12px] font-medium text-[var(--brand-primary)] hover:underline"
              >
                <Layers className="h-3 w-3" />
                <span>Variant of {parentPart.ipn}</span>
              </Link>
            )}
          </div>

          {part.description && (
            <p className="mt-1 max-w-2xl text-[13px] text-[var(--text-secondary)]">{part.description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission("STOCK:CREATE") && (
            <Link
              href={`/stock?addStock=true&partId=${part.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
            >
              <Plus className="h-4 w-4 text-[var(--status-success-fg)]" />
              <span>Add Stock</span>
            </Link>
          )}

          {hasPermission("PART:CREATE") && editMode && (
            <button
              type="button"
              onClick={() => {
                setVariantSku(`${part.ipn}-V${variants.length + 1}`);
                setVariantName(`${part.name} Variant ${variants.length + 1}`);
                setVariantError(null);
                setShowVariantModal(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] bg-white px-3 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
            >
              <Layers className="h-4 w-4 text-[var(--status-violet-fg)]" />
              <span>+ Variant</span>
            </button>
          )}

          {hasPermission("PART:UPDATE") && editMode && (
            <button
              type="button"
              onClick={() => {
                setEditForm({
                  ipn: part.ipn,
                  name: part.name,
                  description: part.description ?? "",
                  categoryId: part.categoryId ?? "",
                  unit: part.unit,
                  minimumStock: String(part.minimumStock),
                  costPrice: costPrice !== null ? String(costPrice) : "",
                  sellingPrice: sellingPrice !== null ? String(sellingPrice) : "",
                  taxRate: taxRate !== null ? String(taxRate) : "",
                  currency,
                  barcode: readMetaString(part.metadata, "barcode", ""),
                  active: part.active,
                  assembly: part.assembly,
                  trackable: part.trackable,
                  purchaseable: part.purchaseable,
                  salable: part.salable,
                  virtual: part.virtual,
                });
                setEditError(null);
                setShowEditModal(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-3.5 text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Item</span>
            </button>
          )}
        </div>
      </div>

      <EditModeHint actionDescription="edit item details, add variants, or remove specs/notes" />

      {/* Low Stock Alert */}
      {isLowStock && (
        <Alert variant="warning" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>Low stock alert:</strong> Current stock ({Number(stockSummary?.inStock ?? 0).toLocaleString()}{" "}
              {part.unit}) is at or below the reorder point ({Number(part.minimumStock).toLocaleString()}{" "}
              {part.unit}).
            </span>
          </div>
          <Button asChild size="sm" className="bg-[var(--status-warning-fg)] text-white hover:opacity-90">
            <Link href="/purchasing">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Reorder Stock</span>
            </Link>
          </Button>
        </Alert>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="In Stock"
          value={`${Number(stockSummary?.inStock ?? 0).toLocaleString()} ${part.unit}`}
          hint={`Reorder point: ${Number(part.minimumStock).toLocaleString()} ${part.unit}`}
          mono
        />
        <StatTile
          label="Available"
          value={`${Number(stockSummary?.availableStock ?? 0).toLocaleString()} ${part.unit}`}
          hint="Ready to sell or use"
          mono
        />
        <StatTile
          label="Reserved"
          value={`${reservedStock.toLocaleString()} ${part.unit}`}
          hint="Committed to customer orders"
          mono
        />
        <StatTile
          label="On Order"
          value={`${Number(stockSummary?.onOrder ?? 0).toLocaleString()} ${part.unit}`}
          hint="Incoming from suppliers"
          mono
        />
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DetailTab)}>
        <TabsList className="no-scrollbar w-full justify-start overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* TAB: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pricing & Margin */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--brand-primary)]" />
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Pricing & Margin</h2>
              </div>
              {hasPermission("PART:UPDATE") && (
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({
                      ipn: part.ipn,
                      name: part.name,
                      description: part.description ?? "",
                      categoryId: part.categoryId ?? "",
                      unit: part.unit,
                      minimumStock: String(part.minimumStock),
                      costPrice: costPrice !== null ? String(costPrice) : "",
                      sellingPrice: sellingPrice !== null ? String(sellingPrice) : "",
                      taxRate: taxRate !== null ? String(taxRate) : "",
                      currency,
                      barcode: readMetaString(part.metadata, "barcode", ""),
                      active: part.active,
                      assembly: part.assembly,
                      trackable: part.trackable,
                      purchaseable: part.purchaseable,
                      salable: part.salable,
                      virtual: part.virtual,
                    });
                    setEditError(null);
                    setShowEditModal(true);
                  }}
                  className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline"
                >
                  Edit pricing →
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="ims-subcard">
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Cost Price
                </div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-[var(--text-primary)]">
                  {costPrice !== null ? `${currency} ${costPrice.toFixed(2)}` : "Not set"}
                </div>
              </div>
              <div className="ims-subcard">
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Selling Price
                </div>
                <div className="mt-1 font-mono text-[16px] font-semibold text-[var(--brand-primary)]">
                  {sellingPrice !== null ? `${currency} ${sellingPrice.toFixed(2)}` : "Not set"}
                </div>
              </div>
              <div className="ims-subcard">
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Gross Margin
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-[var(--status-success-fg)]">
                  {grossMarginPct !== null ? `${grossMarginPct.toFixed(1)}%` : "—"}
                </div>
              </div>
              <div className="ims-subcard">
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  Tax Rate
                </div>
                <div className="mt-1 font-mono text-[15px] font-semibold text-[var(--text-primary)]">
                  {taxRate !== null ? `${taxRate}%` : "—"}
                </div>
              </div>
            </div>
          </Card>

          {/* Barcode & Label */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-[var(--brand-primary)]" />
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Barcode & Label</h2>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border-subtle)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Label</span>
              </button>
            </div>
            <div className="ims-subcard mt-4 flex flex-wrap items-center gap-4 p-4">
              {hasFeature("BARCODES") ? (
                <img
                  src={`/api/v1/barcode/image?code=${encodeURIComponent(barcodeValue)}&format=CODE_128&width=220&height=70`}
                  alt={`Barcode ${barcodeValue}`}
                  className="h-[70px] rounded border border-[var(--border-subtle)] bg-white p-1"
                />
              ) : (
                <div className="flex h-[70px] w-[180px] items-center justify-center rounded border border-dashed border-[var(--border-strong)] bg-white text-[12px] text-[var(--text-muted)]">
                  Barcode preview
                </div>
              )}
              <div className="space-y-1 text-[13px]">
                <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  Scan Code
                </div>
                <div className="font-mono text-[15px] font-semibold text-[var(--text-primary)]">
                  {barcodeValue}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)]">
                  Unit: <span className="font-mono">{part.unit}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Item Settings & Capabilities */}
          <Card>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Item Settings</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              {[
                { label: "For Sale", enabled: part.salable },
                { label: "Purchased from Suppliers", enabled: part.purchaseable },
                { label: "Track Serial Numbers", enabled: part.trackable },
                { label: "Kit / Bundle", enabled: part.assembly },
              ].map((flag) => (
                <div
                  key={flag.label}
                  className="flex items-center justify-between rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2"
                >
                  <span className="text-[var(--text-primary)]">{flag.label}</span>
                  <StatusBadge
                    label={flag.enabled ? "Yes" : "No"}
                    tone={flag.enabled ? "primary" : "neutral"}
                    showDot={false}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Stock by Location Snapshot */}
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Stock by Location</h2>
              <button
                type="button"
                onClick={() => setActiveTab("locations")}
                className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline"
              >
                Manage stock →
              </button>
            </div>
            {stockItems.length === 0 ? (
              <p className="mt-4 text-[13px] text-[var(--text-muted)]">
                No stock recorded yet. Use <strong>Add Stock</strong> above to receive initial inventory.
              </p>
            ) : (
              <dl className="mt-4 divide-y divide-[var(--border-subtle)] text-[13px]">
                {stockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <dt className="text-[var(--text-secondary)]">
                      {item.locationPathString ?? item.locationName ?? "Unassigned Location"}
                      {item.serialNumber ? ` · SN: ${item.serialNumber}` : ""}
                    </dt>
                    <dd className="font-mono font-semibold text-[var(--text-primary)]">
                      {Number(item.quantity).toLocaleString()} {part.unit}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </div>
      )}

      {/* TAB: Stock & Locations */}
      {activeTab === "locations" && (
        <div className="space-y-4 rounded-[12px] border border-[var(--border-subtle)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Stock by Location ({stockItems.length})
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)]">
                View quantities across shelves/rooms and quickly adjust or transfer stock.
              </p>
            </div>
            {hasPermission("STOCK:CREATE") && (
              <Link
                href={`/stock?addStock=true&partId=${part.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-3 text-[12px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Stock</span>
              </Link>
            )}
          </div>

          {/* Mobile Stock Cards */}
          <div className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] md:hidden">
            {stockItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                No stock lots found for this item.
              </div>
            ) : (
              stockItems.map((item) => (
                <div key={item.id} className="space-y-2.5 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--text-primary)]">
                        {item.locationPathString ?? item.locationName ?? "Unassigned"}
                      </div>
                      <div className="font-mono text-[12px] text-[var(--text-muted)]">
                        {item.serialNumber
                          ? `SN: ${item.serialNumber}`
                          : item.batchCode
                            ? `Lot: ${item.batchCode}`
                            : "Standard lot"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[14px] font-semibold text-[var(--text-primary)]">
                        {Number(item.quantity).toLocaleString()} {part.unit}
                      </span>
                      <StatusBadge
                        label={item.status}
                        tone={item.status === "OK" ? "success" : "warning"}
                      />
                    </div>
                  </div>
                  {hasPermission("STOCK:UPDATE") && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOpQty("1");
                          setOpNotes("");
                          setOpError(null);
                          setStockOp({ type: "add", item });
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[var(--border-subtle)] text-[12px] font-medium hover:bg-[var(--bg-canvas)]"
                      >
                        <Plus className="h-3.5 w-3.5 text-[var(--status-success-fg)]" />
                        <span>Add</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpQty("1");
                          setOpNotes("");
                          setOpError(null);
                          setStockOp({ type: "remove", item });
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[var(--border-subtle)] text-[12px] font-medium hover:bg-[var(--bg-canvas)]"
                      >
                        <Minus className="h-3.5 w-3.5 text-[var(--status-danger-fg)]" />
                        <span>Remove</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpQty(String(item.quantity));
                          setOpLocationId(
                            locations.find((l) => !l.structural && l.id !== item.locationId)?.id ?? ""
                          );
                          setOpNotes("");
                          setOpError(null);
                          setStockOp({ type: "transfer", item });
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[var(--border-subtle)] text-[12px] font-medium hover:bg-[var(--bg-canvas)]"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                        <span>Move</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="ims-table-wrap hidden md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="ims-table-head">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2.5 font-semibold">Location</th>
                  <th className="px-4 py-2.5 font-semibold">Batch / Serial</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Quantity</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {stockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      No stock lots found for this item.
                    </td>
                  </tr>
                ) : (
                  stockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {item.locationPathString ?? item.locationName ?? "Unassigned"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--text-secondary)]">
                        {item.serialNumber
                          ? `SN: ${item.serialNumber}`
                          : item.batchCode
                            ? `Lot: ${item.batchCode}`
                            : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          label={item.status}
                          tone={item.status === "OK" ? "success" : "warning"}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-[var(--text-primary)]">
                        {Number(item.quantity).toLocaleString()} {part.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {hasPermission("STOCK:UPDATE") && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              title="Add stock"
                              onClick={() => {
                                setOpQty("1");
                                setOpNotes("");
                                setOpError(null);
                                setStockOp({ type: "add", item });
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] px-2 text-[12px] hover:bg-[var(--bg-canvas)]"
                            >
                              <Plus className="h-3 w-3 text-[var(--status-success-fg)]" />
                              <span>Add</span>
                            </button>
                            <button
                              type="button"
                              title="Remove stock"
                              onClick={() => {
                                setOpQty("1");
                                setOpNotes("");
                                setOpError(null);
                                setStockOp({ type: "remove", item });
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] px-2 text-[12px] hover:bg-[var(--bg-canvas)]"
                            >
                              <Minus className="h-3 w-3 text-[var(--status-danger-fg)]" />
                              <span>Remove</span>
                            </button>
                            <button
                              type="button"
                              title="Transfer location"
                              onClick={() => {
                                setOpQty(String(item.quantity));
                                setOpLocationId(
                                  locations.find((l) => !l.structural && l.id !== item.locationId)?.id ?? ""
                                );
                                setOpNotes("");
                                setOpError(null);
                                setStockOp({ type: "transfer", item });
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] px-2 text-[12px] hover:bg-[var(--bg-canvas)]"
                            >
                              <ArrowRightLeft className="h-3 w-3 text-[var(--brand-primary)]" />
                              <span>Move</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Stock History */}
      {activeTab === "activity" && (
        <div className="space-y-4 rounded-[12px] border border-[var(--border-subtle)] bg-white p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Stock Movement History</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Recent additions, removals, stock counts, and location transfers for this item.
            </p>
          </div>
          {trackingHistory.length === 0 ? (
            <EmptyState
              title="No stock movements yet"
              description="Additions, sales, counts, and transfers will appear here automatically."
            />
          ) : (
            <>
              <div className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] md:hidden">
                {trackingHistory.map((tr) => (
                  <div key={tr.id} className="space-y-1 p-3.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{tr.trackingType}</span>
                      <span
                        className={`font-mono font-semibold ${
                          tr.quantityDelta >= 0 ? "text-[var(--status-success-fg)]" : "text-[var(--status-danger-fg)]"
                        }`}
                      >
                        {tr.quantityDelta >= 0 ? `+${tr.quantityDelta}` : tr.quantityDelta} → {tr.quantityAfter} {part.unit}
                      </span>
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)]">
                      {tr.locationPathString ?? "—"} · {new Date(tr.createdAt).toLocaleString()}
                    </div>
                    {tr.notes && <div className="text-[12px] text-[var(--text-muted)]">{tr.notes}</div>}
                  </div>
                ))}
              </div>

              <div className="ims-table-wrap hidden md:block">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="ims-table-head">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 font-semibold">Action</th>
                    <th className="px-4 py-2 font-semibold">Location</th>
                    <th className="px-4 py-2 text-right font-semibold">Change</th>
                    <th className="px-4 py-2 text-right font-semibold">Balance</th>
                    <th className="px-4 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {trackingHistory.map((tr) => (
                    <tr key={tr.id}>
                      <td className="px-4 py-2 text-[12px] text-[var(--text-secondary)]">
                        {new Date(tr.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{tr.trackingType}</td>
                      <td className="px-4 py-2 text-[12px] text-[var(--text-secondary)]">
                        {tr.locationPathString ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono font-semibold ${
                          tr.quantityDelta >= 0 ? "text-[var(--status-success-fg)]" : "text-[var(--status-danger-fg)]"
                        }`}
                      >
                        {tr.quantityDelta >= 0 ? `+${tr.quantityDelta}` : tr.quantityDelta}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[var(--text-primary)]">
                        {tr.quantityAfter} {part.unit}
                      </td>
                      <td className="px-4 py-2 text-[12px] text-[var(--text-secondary)]">{tr.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Specifications */}
      {activeTab === "specs" && (
        <div className="space-y-4 rounded-[12px] border border-[var(--border-subtle)] bg-white p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Item Specifications</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Store searchable attributes such as size, color, material, or electrical rating.
            </p>
          </div>

          {paramError && (
            <div className="ims-alert-error">
              {paramError}
            </div>
          )}

          {hasPermission("PART:UPDATE") && (
            <form
              onSubmit={handleUpsertParameter}
              className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-border bg-background p-3"
            >
              <div className="min-w-[220px] flex-1">
                <Input
                  type="text"
                  required
                  list="spec-template-options"
                  value={paramName}
                  onChange={(e) => setParamName(e.target.value)}
                  placeholder="Specification name (e.g. Weight, Color)…"
                />
              </div>

              <Input
                type="text"
                required
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder="Enter value (e.g. 10 kg, Black)…"
                className="min-w-[240px] flex-1"
              />

              <Button type="submit" disabled={savingParam || !paramName.trim()}>
                <Plus className="h-4 w-4" />
                <span>{savingParam ? "Saving…" : "Save Spec"}</span>
              </Button>
            </form>
          )}

          {/* Mobile Stock Cards */}
          <div className="divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] md:hidden">
            {stockItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                No stock lots found for this item.
              </div>
            ) : (
              stockItems.map((item) => (
                <div key={item.id} className="space-y-2.5 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--text-primary)]">
                        {item.locationPathString ?? item.locationName ?? "Unassigned"}
                      </div>
                      <div className="font-mono text-[12px] text-[var(--text-muted)]">
                        {item.serialNumber
                          ? `SN: ${item.serialNumber}`
                          : item.batchCode
                            ? `Lot: ${item.batchCode}`
                            : "Standard lot"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[14px] font-semibold text-[var(--text-primary)]">
                        {Number(item.quantity).toLocaleString()} {part.unit}
                      </span>
                      <StatusBadge
                        label={item.status}
                        tone={item.status === "OK" ? "success" : "warning"}
                      />
                    </div>
                  </div>
                  {hasPermission("STOCK:UPDATE") && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOpQty("1");
                          setOpNotes("");
                          setOpError(null);
                          setStockOp({ type: "add", item });
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[var(--border-subtle)] text-[12px] font-medium hover:bg-[var(--bg-canvas)]"
                      >
                        <Plus className="h-3.5 w-3.5 text-[var(--status-success-fg)]" />
                        <span>Add</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpQty("1");
                          setOpNotes("");
                          setOpError(null);
                          setStockOp({ type: "remove", item });
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[var(--border-subtle)] text-[12px] font-medium hover:bg-[var(--bg-canvas)]"
                      >
                        <Minus className="h-3.5 w-3.5 text-[var(--status-danger-fg)]" />
                        <span>Remove</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpQty(String(item.quantity));
                          setOpLocationId(
                            locations.find((l) => !l.structural && l.id !== item.locationId)?.id ?? ""
                          );
                          setOpNotes("");
                          setOpError(null);
                          setStockOp({ type: "transfer", item });
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-[8px] border border-[var(--border-subtle)] text-[12px] font-medium hover:bg-[var(--bg-canvas)]"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                        <span>Move</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="ims-table-wrap hidden md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="ims-table-head">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2.5 font-semibold">Specification</th>
                  <th className="px-4 py-2.5 font-semibold">Value</th>
                  <th className="px-4 py-2.5 font-semibold">Unit / Type</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {part.parameters.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      No specifications recorded for this item yet.
                    </td>
                  </tr>
                ) : (
                  part.parameters.map((pp) => (
                    <tr key={pp.id}>
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                        {pp.templateName}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-[var(--brand-primary)]">
                        {pp.valueText}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)]">
                        {pp.checkbox ? "Yes/No" : pp.templateUnits || "Text"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {hasPermission("PART:UPDATE") && editMode && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: "param",
                                id: pp.id,
                                label: pp.templateName,
                              })
                            }
                            className="text-[12px] text-[var(--status-danger-fg)] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Suppliers */}
      {activeTab === "suppliers" && (
        <div className="space-y-6">
          <div className="ims-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  Suppliers & Purchase Pricing ({supplierParts.length})
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Vendor SKUs, minimum order quantities, and pack-to-unit conversions ({part.unit}).
                </p>
              </div>
              {hasPermission("COMPANY:CREATE") && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setSupplierForm({
                      supplierId: suppliers[0]?.id ?? "",
                      sku: `${part.ipn}-SUP`,
                      packQuantity: "1",
                      moq: "1",
                      leadTimeDays: "",
                      unitPrice: "",
                      currency: currency || "USD",
                    });
                    setSupplierError(null);
                    setShowAddSupplierModal(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Supplier</span>
                </Button>
              )}
            </div>
            <div className="mt-3 overflow-x-auto rounded-[8px] border border-[var(--border-subtle)]">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="ims-table-head">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="px-4 py-2 font-semibold">Supplier</th>
                    <th className="px-4 py-2 font-semibold">Vendor SKU</th>
                    <th className="px-4 py-2 font-semibold">Pack Size & MOQ</th>
                    <th className="px-4 py-2 font-semibold">Price Breaks</th>
                    {hasPermission("COMPANY:UPDATE") && (
                      <th className="px-4 py-2 text-right font-semibold">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {supplierParts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={hasPermission("COMPANY:UPDATE") ? 5 : 4}
                        className="px-4 py-6 text-center text-[var(--text-muted)]"
                      >
                        No suppliers linked to this item yet.
                      </td>
                    </tr>
                  ) : (
                    supplierParts.map((sp) => (
                      <tr key={sp.id}>
                        <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                          <Link
                            href={`/companies/${sp.supplierId}`}
                            className="text-[var(--brand-primary)] hover:underline"
                          >
                            {sp.supplierName}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-[var(--text-primary)]">
                          {sp.sku}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px]">
                          1 pack = {sp.packQuantity} {part.unit} (MOQ {sp.moq})
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px]">
                          {sp.priceBreaks.length === 0
                            ? "—"
                            : sp.priceBreaks.map((pb) => (
                                <div key={pb.id} className="flex items-center gap-2">
                                  <span>
                                    ≥{pb.minQuantity}: {pb.unitPrice} {pb.currency}/pack →{" "}
                                    <span className="font-semibold text-[var(--brand-primary)]">
                                      {pb.convertedInternalUnitPriceInBase} {pb.tenantBaseCurrency}/
                                      {part.unit}
                                    </span>
                                  </span>
                                  {hasPermission("COMPANY:UPDATE") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePriceBreak(sp.id, pb.id)}
                                      title="Remove price break"
                                      className="text-[var(--text-muted)] hover:text-[var(--status-danger-fg)]"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                        </td>
                        {hasPermission("COMPANY:UPDATE") && (
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPbForm({
                                  minQuantity: "1",
                                  unitPrice: "",
                                  currency: sp.currency || currency || "USD",
                                });
                                setPbError(null);
                                setPriceBreakTarget(sp);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              <span>Price Break</span>
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dialog: Add Supplier */}
          <Dialog open={showAddSupplierModal} onOpenChange={setShowAddSupplierModal}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Supplier for {part.ipn}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSupplierPart} className="space-y-4">
                {supplierError && (
                  <Alert variant="destructive">
                    <AlertDescription>{supplierError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1">
                  <Label>Supplier *</Label>
                  {suppliers.length === 0 ? (
                    <div className="text-[12px] text-[var(--text-muted)]">
                      No suppliers found.{" "}
                      <Link href="/companies" className="text-[var(--brand-primary)] hover:underline">
                        Create a supplier in Companies first →
                      </Link>
                    </div>
                  ) : (
                    <Combobox
                      value={supplierForm.supplierId}
                      onValueChange={(val) => setSupplierForm({ ...supplierForm, supplierId: val })}
                      placeholder="Select supplier…"
                      searchPlaceholder="Search suppliers…"
                      options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Vendor SKU *</Label>
                    <Input
                      type="text"
                      required
                      value={supplierForm.sku}
                      onChange={(e) => setSupplierForm({ ...supplierForm, sku: e.target.value })}
                      placeholder="SUP-SKU-001"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Pack Size ({part.unit} per pack)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={supplierForm.packQuantity}
                      onChange={(e) => setSupplierForm({ ...supplierForm, packQuantity: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>MOQ (packs)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      value={supplierForm.moq}
                      onChange={(e) => setSupplierForm({ ...supplierForm, moq: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit Price (optional)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={supplierForm.unitPrice}
                      onChange={(e) => setSupplierForm({ ...supplierForm, unitPrice: e.target.value })}
                      placeholder="0.00"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <CurrencySelect
                      value={supplierForm.currency}
                      onValueChange={(val) => setSupplierForm({ ...supplierForm, currency: val })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddSupplierModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingSupplier || !supplierForm.supplierId}>
                    {savingSupplier ? "Saving…" : "Save Supplier"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Add Price Break */}
          <Dialog
            open={priceBreakTarget !== null}
            onOpenChange={(open) => !open && setPriceBreakTarget(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Price Break · {priceBreakTarget?.sku}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPriceBreak} className="space-y-4">
                {pbError && (
                  <Alert variant="destructive">
                    <AlertDescription>{pbError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Min Qty (packs) *</Label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={pbForm.minQuantity}
                      onChange={(e) => setPbForm({ ...pbForm, minQuantity: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Price / pack *</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={pbForm.unitPrice}
                      onChange={(e) => setPbForm({ ...pbForm, unitPrice: e.target.value })}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <CurrencySelect
                      value={pbForm.currency}
                      onValueChange={(val) => setPbForm({ ...pbForm, currency: val })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPriceBreakTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingPb}>
                    {savingPb ? "Saving…" : "Save Price Break"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {manufacturerParts.length > 0 && (
            <div className="ims-card">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Manufacturer Part Numbers ({manufacturerParts.length})
              </h2>
              <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] text-[13px]">
                {manufacturerParts.map((mp) => (
                  <div key={mp.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="font-mono font-semibold text-[var(--brand-primary)]">{mp.mpn}</span>
                      <span className="ml-2 text-[var(--text-secondary)]">by {mp.manufacturerName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Kit / Bundle */}
      {activeTab === "kit" && (
        <div className="space-y-6">
          <div className="ims-card">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Kit / Bundle Contents</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Items included in one unit of {part.name}.
            </p>
          </div>

          {hasPermission("PART:UPDATE") && part.assembly && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBomError(null);
                try {
                  await apiFetch(`/api/v1/parts/${partId}/bom`, {
                    method: "POST",
                    body: JSON.stringify({
                      subPartId: bomSubPartId,
                      quantity: Number(bomQuantity),
                      reference: null,
                    }),
                  });
                  setBomSubPartId("");
                  setBomQuantity("1");
                  toast.success("Item added to kit");
                  await loadAll();
                } catch (err) {
                  setBomError(err instanceof Error ? err.message : "Failed to add item");
                  toastApiError(err, "Failed to add item to kit");
                }
              }}
              className="space-y-3 rounded-[12px] border border-[var(--border-subtle)] bg-white p-4"
            >
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">Add Item to Kit</div>
              {bomError && <div className="text-[12px] text-red-600">{bomError}</div>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Combobox
                    value={bomSubPartId}
                    onValueChange={setBomSubPartId}
                    placeholder="Select item…"
                    searchPlaceholder="Search parts by SKU or name…"
                    options={allParts
                      .filter((ap) => ap.id !== partId)
                      .map((ap) => ({
                        value: ap.id,
                        label: `${ap.ipn ? `${ap.ipn} — ` : ""}${ap.name}`,
                      }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="any"
                    min="0.0001"
                    required
                    value={bomQuantity}
                    onChange={(e) => setBomQuantity(e.target.value)}
                    placeholder="Qty"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!bomSubPartId}>
                    Add
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-[12px] border border-[var(--border-subtle)] bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-[var(--bg-muted)] text-left text-[11px] uppercase text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-2.5">Included Item</th>
                  <th className="px-4 py-2.5 text-right">Quantity</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {bomItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-[var(--text-muted)]">
                      No items in this kit yet.
                    </td>
                  </tr>
                ) : (
                  bomItems.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/parts/${b.subPartId}`}
                          className="font-medium text-[var(--brand-primary)] hover:underline"
                        >
                          {b.subPartIpn ? `${b.subPartIpn} · ` : ""}
                          {b.subPartName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {b.quantity} {b.subPartUnit ?? ""}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {hasPermission("PART:UPDATE") && editMode && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                type: "bom",
                                id: b.id,
                                label: b.subPartName,
                              })
                            }
                            className="text-[12px] text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {whereUsed.length > 0 && (
            <div className="space-y-3 rounded-[12px] border border-[var(--border-subtle)] bg-white p-5">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Included in Kits ({whereUsed.length})
              </h3>
              <div className="divide-y divide-[var(--border-subtle)]">
                {whereUsed.map((wu) => (
                  <div key={wu.id} className="flex items-center justify-between py-2 text-[13px]">
                    <Link
                      href={`/parts/${wu.partId}`}
                      className="font-medium text-[var(--brand-primary)] hover:underline"
                    >
                      Kit {wu.partId}
                    </Link>
                    <span className="font-mono text-[var(--text-secondary)]">Qty: {wu.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Variants */}
      {activeTab === "variants" && (
        <div className="ims-card">
          {parentPart && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--border-brand)] bg-[var(--brand-tint)] px-3.5 py-2.5 text-[13px]">
              <div>
                <span className="text-[var(--text-secondary)]">This item is a variant of </span>
                <Link
                  href={`/parts/${parentPart.id}`}
                  className="font-mono font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  {parentPart.ipn} — {parentPart.name}
                </Link>
              </div>
              <Link
                href={`/parts/${parentPart.id}`}
                className="text-[12px] font-medium text-[var(--brand-primary)] hover:underline"
              >
                View Parent →
              </Link>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Product Variants ({variants.length})
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Size, color, or model variations of this item.
              </p>
            </div>
            {hasPermission("PART:CREATE") && (
              <button
                type="button"
                onClick={() => {
                  setVariantSku(`${part.ipn}-V${variants.length + 1}`);
                  setVariantName(`${part.name} Variant ${variants.length + 1}`);
                  setVariantError(null);
                  setShowVariantModal(true);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[var(--brand-primary)] px-3 text-[12px] font-medium text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Variant</span>
              </button>
            )}
          </div>

          {variants.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No variants defined"
                description="Create variants when you sell multiple sizes, colors, or models of this item."
              />
            </div>
          ) : (
            <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-3.5 py-2.5">
                  <div>
                    <Link
                      href={`/parts/${v.id}`}
                      className="font-mono text-[13px] font-medium text-[var(--brand-primary)] hover:underline"
                    >
                      {v.ipn}
                    </Link>
                    <div className="text-[12px] text-[var(--text-primary)]">{v.name}</div>
                  </div>
                  <StatusBadge
                    label={v.active ? "Active" : "Inactive"}
                    tone={v.active ? "success" : "neutral"}
                    showDot={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Notes & Files */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="ims-card">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Internal Notes ({notes.length})
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Keep supplier remarks, warranty details, or handling instructions for staff.
            </p>

            <form onSubmit={handleAddNote} className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note for this item…"
                className="w-full rounded-[8px] border border-[var(--border-subtle)] p-2.5 text-[13px]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 rounded-[8px] bg-[var(--brand-primary)] px-3 text-[12px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
                >
                  Save Note
                </button>
              </div>
            </form>

            <div className="mt-4 space-y-2">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-[13px]"
                >
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {editMode && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            type: "note",
                            id: n.id,
                            label: "this note",
                          })
                        }
                        className="text-[var(--status-danger-fg)] hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[var(--text-primary)]">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ims-card">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Files & Manuals ({attachments.length})
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Attach product manuals, warranty cards, or supplier quotes.
            </p>

            <form
              onSubmit={handleCreateAttachment}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              <input
                type="text"
                required
                value={attachmentFileName}
                onChange={(e) => setAttachmentFileName(e.target.value)}
                placeholder="manual.pdf"
                className="h-9 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-[12px]"
              />
              <input
                type="text"
                value={attachmentComment}
                onChange={(e) => setAttachmentComment(e.target.value)}
                placeholder="Comment (optional)"
                className="h-9 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-[12px]"
              />
              <button
                type="submit"
                className="h-9 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 text-[12px] font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
              >
                + Attach File
              </button>
            </form>

            <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
              {attachments.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[var(--text-muted)]">
                  No files attached to this item yet.
                </div>
              ) : (
                attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between px-3.5 py-2.5 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{att.fileName}</div>
                        {att.comment && (
                          <div className="text-[11px] text-[var(--text-muted)]">{att.comment}</div>
                        )}
                      </div>
                    </div>
                    <StatusBadge label={att.status} tone="success" showDot={false} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Stock Operation */}
      <Modal
        open={Boolean(stockOp)}
        onClose={() => setStockOp(null)}
        maxWidthClass="max-w-md"
        title={
          stockOp?.type === "add"
            ? "Increase Stock"
            : stockOp?.type === "remove"
              ? "Remove Stock"
              : stockOp?.type === "count"
                ? "Stock Count"
                : "Move Stock"
        }
      >
        <form onSubmit={handleRunStockOp} className="space-y-3">
          {opError && <div className="ims-alert-error">{opError}</div>}

          {stockOp?.type === "transfer" && (
            <div>
              <label className="ims-label">Destination Location *</label>
              <select
                required
                value={opLocationId}
                onChange={(e) => setOpLocationId(e.target.value)}
                className="ims-select mt-1"
              >
                <option value="">Select location…</option>
                {locations
                  .filter((l) => !l.structural)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.pathString}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="ims-label">Quantity ({part.unit}) *</label>
            <input
              type="number"
              step="any"
              min="0.0001"
              required
              value={opQty}
              onChange={(e) => setOpQty(e.target.value)}
              className="ims-input mt-1 font-mono"
            />
          </div>

          <div>
            <label className="ims-label">Reason / Notes</label>
            <input
              type="text"
              value={opNotes}
              onChange={(e) => setOpNotes(e.target.value)}
              placeholder="e.g. Walk-in sale, damaged, restock…"
              className="ims-input mt-1"
            />
          </div>

          <div className="ims-modal-footer">
            <button type="button" onClick={() => setStockOp(null)} className="ims-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={opSaving} className="ims-btn-primary">
              {opSaving ? "Saving…" : "Confirm"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Variant */}
      <Modal
        open={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        maxWidthClass="max-w-md"
        title="Create Product Variant"
      >
        <form onSubmit={handleCreateVariant} className="space-y-3">
          {variantError && <div className="ims-alert-error">{variantError}</div>}
          <div>
            <label className="ims-label">Variant SKU *</label>
            <input
              type="text"
              required
              value={variantSku}
              onChange={(e) => setVariantSku(e.target.value)}
              className="ims-input mt-1 font-mono"
            />
          </div>
          <div>
            <label className="ims-label">Variant Name *</label>
            <input
              type="text"
              required
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="ims-input mt-1"
            />
          </div>

          <div className="ims-modal-footer">
            <button
              type="button"
              onClick={() => setShowVariantModal(false)}
              className="ims-btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="ims-btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Item */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Item · ${part.ipn}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-3">
          {editError && <div className="ims-alert-error">{editError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ims-label">SKU / Item Code *</label>
              <input
                type="text"
                required
                value={editForm.ipn}
                onChange={(e) => setEditForm({ ...editForm, ipn: e.target.value })}
                className="ims-input mt-1 font-mono"
              />
            </div>
            <div>
              <label className="ims-label">Barcode</label>
              <input
                type="text"
                value={editForm.barcode}
                onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                placeholder="Defaults to SKU"
                className="ims-input mt-1 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="ims-label">Item Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="ims-input mt-1"
            />
          </div>
          <div>
            <label className="ims-label">Description</label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="ims-input mt-1"
            />
          </div>
          <div>
            <label className="ims-label">Category</label>
            <select
              value={editForm.categoryId}
              onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
              className="ims-select mt-1"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} disabled={c.structural}>
                  {c.pathString} {c.structural ? "(Folder)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ims-label">Unit</label>
              <input
                type="text"
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                className="ims-input mt-1 font-mono"
              />
            </div>
            <div>
              <label className="ims-label">Reorder Point</label>
              <input
                type="number"
                step="any"
                value={editForm.minimumStock}
                onChange={(e) => setEditForm({ ...editForm, minimumStock: e.target.value })}
                className="ims-input mt-1 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="ims-label">Currency</label>
              <CurrencySelect
                value={editForm.currency}
                onValueChange={(val) => setEditForm({ ...editForm, currency: val })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="ims-label">Cost Price</label>
              <input
                type="number"
                step="0.01"
                value={editForm.costPrice}
                onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                className="ims-input mt-1 px-2.5 font-mono"
              />
            </div>
            <div>
              <label className="ims-label">Selling Price</label>
              <input
                type="number"
                step="0.01"
                value={editForm.sellingPrice}
                onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                className="ims-input mt-1 px-2.5 font-mono"
              />
            </div>
            <div>
              <label className="ims-label">Tax %</label>
              <input
                type="number"
                step="0.01"
                value={editForm.taxRate}
                onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })}
                className="ims-input mt-1 px-2.5 font-mono"
              />
            </div>
          </div>

          <div className="ims-subcard grid grid-cols-2 gap-2 text-[12px]">
            {[
              { key: "active", label: "Active" },
              { key: "salable", label: "For Sale" },
              { key: "purchaseable", label: "Purchased from Suppliers" },
              { key: "trackable", label: "Track Serial Numbers" },
              { key: "assembly", label: "Kit / Bundle" },
              { key: "virtual", label: "Non-Physical Service" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={Boolean(editForm[opt.key as keyof typeof editForm])}
                  onChange={(e) => setEditForm({ ...editForm, [opt.key]: e.target.checked })}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="ims-modal-footer">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="ims-btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="ims-btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
      {/* Confirm Delete Spec / BOM Item / Note */}
      <AlertDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{confirmDelete?.label}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDelete) return;
                const target = confirmDelete;
                setConfirmDelete(null);
                if (target.type === "param") {
                  await handleDeleteParameter(target.id);
                } else if (target.type === "note") {
                  await handleDeleteNote(target.id);
                } else if (target.type === "bom") {
                  try {
                    await apiFetch(`/api/v1/bom-items/${target.id}`, { method: "DELETE" });
                    toast.success("Item removed from kit");
                    await loadAll();
                  } catch (err) {
                    toastApiError(err, "Failed to remove item from kit");
                  }
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
