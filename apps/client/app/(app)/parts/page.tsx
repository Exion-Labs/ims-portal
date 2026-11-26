"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  CategoryView,
  PageResponse,
  PartView,
  StockSummaryView,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  ImportWizard,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusBadge,
  toast,
  toastApiError,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { useEditMode } from "@/lib/edit-mode";
import { EditModeHint } from "@/components/edit-mode-hint";
import { ListToolbar } from "@/components/list-toolbar";
import {
  ArrowRightLeft,
  ChevronDown,
  Download,
  Edit3,
  FileSpreadsheet,
  Folder,
  FolderPlus,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";

function PartsCatalogPageContent() {
  const searchParams = useSearchParams();
  const initialCatId = searchParams.get("categoryId");
  const { me, hasFeature, hasPermission, refetch } = useEntitlements();
  const { editMode } = useEditMode();

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [partsPage, setPartsPage] = useState<PageResponse<PartView> | null>(null);
  const [stockSummaries, setStockSummaries] = useState<Record<string, StockSummaryView>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCatId);
  const [includeSubcategories, setIncludeSubcategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<
    "all" | "salable" | "purchaseable" | "trackable" | "low_stock"
  >("all");

  const [pageIndex, setPageIndex] = useState(0);
  const [selectedParts, setSelectedParts] = useState<PartView[]>([]);
  const [showImporter, setShowImporter] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  // Modals
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState<
    null | { mode: "create" | "edit" | "move"; category?: CategoryView }
  >(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryView | null>(null);

  // Item form state (simplified for small business, defaults to purchaseable + salable)
  const [partForm, setPartForm] = useState({
    ipn: "",
    name: "",
    description: "",
    categoryId: "",
    unit: "pcs",
    minimumStock: "0",
    purchaseable: true,
    salable: true,
    trackable: false,
  });
  const [partFormError, setPartFormError] = useState<string | null>(null);
  const [submittingPart, setSubmittingPart] = useState(false);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catParentId, setCatParentId] = useState("");
  const [catFormError, setCatFormError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const cats = await apiFetch<CategoryView[]>("/api/v1/part-categories");
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    }
  }, []);

  const loadParts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageIndex));
      params.set("size", "25");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedCategoryId) {
        params.set("categoryId", selectedCategoryId);
        params.set("includeSubcategories", String(includeSubcategories));
      }
      if (quickFilter === "salable") params.set("salable", "true");
      if (quickFilter === "purchaseable") params.set("purchaseable", "true");
      if (quickFilter === "trackable") params.set("trackable", "true");

      const res = await apiFetch<PageResponse<PartView>>(`/api/v1/parts?${params.toString()}`);
      setPartsPage(res);
      if (res.content.length > 0) {
        try {
          const summaries = await apiFetch<Record<string, StockSummaryView>>(
            "/api/v1/stock/summaries",
            {
              method: "POST",
              body: JSON.stringify({ partIds: res.content.map((p) => p.id) }),
            }
          );
          setStockSummaries(summaries);
        } catch {
          setStockSummaries({});
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, searchQuery, selectedCategoryId, includeSubcategories, quickFilter]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const lowStockCount = useMemo(() => {
    const items = partsPage?.content ?? [];
    return items.filter((p) => {
      const inStock = Number(stockSummaries[p.id]?.inStock ?? 0);
      const minStock = Number(p.minimumStock ?? 0);
      return inStock <= 0 || (minStock > 0 && inStock < minStock);
    }).length;
  }, [partsPage, stockSummaries]);

  const displayedParts = useMemo(() => {
    const items = partsPage?.content ?? [];
    if (quickFilter !== "low_stock") return items;
    return items.filter((p) => {
      const inStock = Number(stockSummaries[p.id]?.inStock ?? 0);
      const minStock = Number(p.minimumStock ?? 0);
      return inStock <= 0 || (minStock > 0 && inStock < minStock);
    });
  }, [partsPage, quickFilter, stockSummaries]);

  async function handleCreatePart(e: React.FormEvent) {
    e.preventDefault();
    setPartFormError(null);
    setSubmittingPart(true);
    try {
      await apiFetch<PartView>("/api/v1/parts", {
        method: "POST",
        body: JSON.stringify({
          ipn: partForm.ipn,
          name: partForm.name,
          description: partForm.description || null,
          categoryId: partForm.categoryId || null,
          revision: "A",
          unit: partForm.unit || "pcs",
          minimumStock: Number(partForm.minimumStock || 0),
          assembly: false,
          component: true,
          trackable: partForm.trackable,
          purchaseable: partForm.purchaseable,
          salable: partForm.salable,
          virtual: false,
        }),
      });
      setShowCreatePart(false);
      toast.success("Item created", {
        description: `${partForm.ipn} — ${partForm.name}`,
      });
      setPartForm({
        ipn: "",
        name: "",
        description: "",
        categoryId: selectedCategory && !selectedCategory.structural ? selectedCategory.id : "",
        unit: "pcs",
        minimumStock: "0",
        purchaseable: true,
        salable: true,
        trackable: false,
      });
      await Promise.all([loadParts(), loadMetadata()]);
      refetch();
    } catch (err) {
      setPartFormError(err instanceof Error ? err.message : "Failed to create item");
      toastApiError(err, "Failed to create item");
    } finally {
      setSubmittingPart(false);
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!showCategoryModal) return;
    setCatFormError(null);
    const mode = showCategoryModal.mode;
    try {
      if (mode === "create") {
        await apiFetch<CategoryView>("/api/v1/part-categories", {
          method: "POST",
          body: JSON.stringify({
            name: catName,
            description: catDesc || null,
            parentId: catParentId || null,
            structural: false,
          }),
        });
      } else if (mode === "edit" && showCategoryModal.category) {
        await apiFetch<CategoryView>(`/api/v1/part-categories/${showCategoryModal.category.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: catName,
            description: catDesc || null,
            structural: showCategoryModal.category.structural,
          }),
        });
      } else if (mode === "move" && showCategoryModal.category) {
        await apiFetch<CategoryView>(
          `/api/v1/part-categories/${showCategoryModal.category.id}/move`,
          {
            method: "POST",
            body: JSON.stringify({
              newParentId: catParentId || null,
            }),
          }
        );
      }
      setShowCategoryModal(null);
      toast.success(
        mode === "create"
          ? "Category created"
          : mode === "edit"
            ? "Category renamed"
            : "Category moved",
        { description: mode === "move" ? showCategoryModal.category?.name : catName }
      );
      await Promise.all([loadMetadata(), loadParts()]);
    } catch (err) {
      setCatFormError(err instanceof Error ? err.message : "Category operation failed");
      toastApiError(err, "Category operation failed");
    }
  }

  async function handleDeleteCategory(category: CategoryView) {
    try {
      await apiFetch<void>(`/api/v1/part-categories/${category.id}?mode=REPARENT`, {
        method: "DELETE",
      });
      if (selectedCategoryId === category.id) {
        setSelectedCategoryId(null);
      }
      toast.success("Category deleted", { description: category.name });
      await Promise.all([loadMetadata(), loadParts()]);
    } catch (err) {
      toastApiError(err, "Failed to delete category");
    }
  }

  const columns = useMemo<ColumnDef<PartView, unknown>[]>(
    () => [
      {
        accessorKey: "ipn",
        header: "Code",
        cell: ({ row }) => (
          <Link
            href={`/parts/${row.original.id}`}
            className="font-mono text-[13px] font-medium text-[var(--brand-primary)] hover:underline"
          >
            {row.original.ipn}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: "Item Name",
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/parts/${row.original.id}`}
                className="text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--brand-primary)]"
              >
                {row.original.name}
              </Link>
              {!row.original.active && (
                <StatusBadge label="Inactive" tone="neutral" showDot={false} />
              )}
            </div>
            {row.original.description && (
              <div className="mt-0.5 max-w-md truncate text-[12px] text-[var(--text-muted)]">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "categoryPathString",
        header: "Category",
        cell: ({ row }) =>
          row.original.categoryPathString ? (
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--bg-muted)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]">
              <Folder className="h-3 w-3 text-[var(--text-muted)]" />
              <span>{row.original.categoryPathString}</span>
            </span>
          ) : (
            <span className="text-[12px] text-[var(--text-muted)]">Uncategorized</span>
          ),
      },
      {
        id: "usage",
        header: "Type",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              {p.purchaseable && <StatusBadge label="Buy" tone="success" showDot={false} />}
              {p.salable && <StatusBadge label="Sell" tone="primary" showDot={false} />}
              {p.trackable && <StatusBadge label="Serial" tone="violet" showDot={false} />}
            </div>
          );
        },
      },
      {
        id: "inStock",
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => {
          const p = row.original;
          const summary = stockSummaries[p.id];
          const inStock = Number(summary?.inStock ?? 0);
          const minStock = Number(p.minimumStock ?? 0);
          const textColor =
            inStock <= 0
              ? "text-[var(--status-danger-fg)]"
              : minStock > 0 && inStock < minStock
                ? "text-[var(--status-warning-fg)]"
                : "text-[var(--status-success-fg)]";
          return (
            <div className={`text-right font-mono text-[13px] font-medium tabular-nums ${textColor}`}>
              {inStock.toLocaleString()} {p.unit}
            </div>
          );
        },
      },
    ],
    [stockSummaries]
  );

  const selectedCount = selectedParts.length;

  function renderCategoryTree(onSelectDone?: () => void) {
    return (
      <>
        <div className="ims-modal-header">
          <div>
            <div className="text-[14px] font-semibold text-[var(--text-primary)]">Categories</div>
            <div className="text-[11px] text-[var(--text-muted)]">Filter items by folder</div>
          </div>
          {hasPermission("PART:CREATE") && editMode && (
            <button
              type="button"
              onClick={() => {
                onSelectDone?.();
                setCatName("");
                setCatDesc("");
                setCatParentId(selectedCategoryId ?? "");
                setCatFormError(null);
                setShowCategoryModal({ mode: "create" });
              }}
              title="New Category"
              className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-[12px] font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]"
            >
              <FolderPlus className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Include Subcategories Toggle */}
        <label className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={includeSubcategories}
            onChange={(e) => {
              setIncludeSubcategories(e.target.checked);
              setPageIndex(0);
            }}
            className="rounded border-[var(--border-subtle)]"
          />
          <span>Include subcategories</span>
        </label>

        {/* Tree Navigation */}
        <div className="mt-3 max-h-[50dvh] space-y-0.5 overflow-y-auto lg:max-h-[500px]">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId(null);
              setPageIndex(0);
              onSelectDone?.();
            }}
            className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[13px] font-medium lg:py-1.5 ${
              selectedCategoryId === null
                ? "bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5" />
              <span>All Categories</span>
            </span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              {me?.usage?.MAX_PARTS ?? partsPage?.totalElements ?? 0}
            </span>
          </button>

          {categories.map((cat) => {
            const active = selectedCategoryId === cat.id;
            const depthPadding = [
              "pl-0",
              "pl-3.5",
              "pl-7",
              "pl-10",
              "pl-14",
              "pl-[70px]",
              "pl-[84px]",
            ][Math.min(cat.depth, 6)];
            return (
              <div
                key={cat.id}
                className={`group flex items-center justify-between rounded-[8px] pr-1 hover:bg-[var(--bg-canvas)] ${depthPadding}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setPageIndex(0);
                    onSelectDone?.();
                  }}
                  className={`flex min-w-0 flex-1 items-center justify-between rounded-[8px] px-2 py-2 text-left text-[13px] lg:py-1.5 ${
                    active ? "bg-[var(--brand-tint)] font-semibold text-[var(--brand-primary)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="ml-1 font-mono text-[11px] text-[var(--text-muted)]">
                    {cat.directPartCount}
                  </span>
                </button>
                {editMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Edit ${cat.name}`}
                        title={`Edit ${cat.name}`}
                        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--brand-primary)]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onSelect={() => {
                          onSelectDone?.();
                          setCatName(cat.name);
                          setCatDesc(cat.description ?? "");
                          setCatFormError(null);
                          setShowCategoryModal({ mode: "edit", category: cat });
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          onSelectDone?.();
                          setCatParentId(cat.parentId ?? "");
                          setCatFormError(null);
                          setShowCategoryModal({ mode: "move", category: cat });
                        }}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Move</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => {
                          onSelectDone?.();
                          setDeleteCategoryTarget(cat);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Category Action Footer */}
        {selectedCategory && (
          <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
            <div className="text-[12px] font-medium text-[var(--text-primary)]">
              {selectedCategory.pathString}
            </div>
            {selectedCategory.description && (
              <div className="text-[11px] text-[var(--text-muted)]">{selectedCategory.description}</div>
            )}
            {editMode ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectDone?.();
                    setCatName(selectedCategory.name);
                    setCatDesc(selectedCategory.description ?? "");
                    setCatFormError(null);
                    setShowCategoryModal({ mode: "edit", category: selectedCategory });
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] bg-white px-2 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Rename</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectDone?.();
                    setCatParentId(selectedCategory.parentId ?? "");
                    setCatFormError(null);
                    setShowCategoryModal({ mode: "move", category: selectedCategory });
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-subtle)] bg-white px-2 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>Move</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectDone?.();
                    setDeleteCategoryTarget(selectedCategory);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/40 px-2 text-[11px] font-medium text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <EditModeHint actionDescription="rename, move, or delete categories" className="mt-1" />
            )}
          </div>
        )}
      </>
    );
  }

  const openCreatePartModal = useCallback(() => {
    setPartFormError(null);
    setPartForm((prev) => ({
      ...prev,
      categoryId:
        selectedCategory && !selectedCategory.structural ? selectedCategory.id : "",
    }));
    setShowCreatePart(true);
  }, [selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Dialog: Import Wizard */}
      <Dialog open={showImporter} onOpenChange={setShowImporter}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Items (CSV / XLSX)</DialogTitle>
          </DialogHeader>
          <ImportWizard
            targetType="PART"
            targetFields={[
              { key: "ipn", label: "SKU / Item Code", required: true },
              { key: "name", label: "Item Name", required: true },
              { key: "description", label: "Description", required: false },
              { key: "category", label: "Category Name / Path", required: false },
              { key: "unit", label: "Unit of Measure (pcs, box, kg)", required: false },
              { key: "minimumStock", label: "Minimum Stock Alert", required: false },
              { key: "purchaseable", label: "Can be Purchased (true/false)", required: false },
              { key: "salable", label: "Can be Sold (true/false)", required: false },
            ]}
          />
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowImporter(false);
                loadParts();
                refetch();
              }}
            >
              Done &amp; Refresh Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Category Picker Pill + Bottom Sheet */}
      <div className="lg:hidden">
        <div className="flex w-full items-center justify-between gap-2 rounded-full border border-[var(--border-subtle)] bg-card px-3.5 py-2 shadow-xs">
          <button
            type="button"
            onClick={() => setShowCategorySheet(true)}
            className="flex min-w-0 items-center gap-2.5 text-left text-[13px] font-medium text-[var(--text-primary)]"
          >
            <Folder className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
            <span className="truncate">
              {selectedCategory ? selectedCategory.pathString : "All Categories"}
            </span>
            <span className="h-4 w-px shrink-0 bg-[var(--border-subtle)]" aria-hidden="true" />
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-normal text-[var(--text-muted)]">
              <span>Filter</span>
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>

          {hasFeature("IMPORT_EXPORT") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setShowImporter((v) => !v)}>
                  <FileSpreadsheet className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span>{showImporter ? "Hide Importer" : "Import CSV / XLSX"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/api/v1/parts/export?format=csv">
                    <Download className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span>Export CSV</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Sheet open={showCategorySheet} onOpenChange={setShowCategorySheet}>
          <SheetContent side="bottom" showCloseButton={false}>
            <SheetHeader className="sr-only">
              <SheetTitle>Select Category</SheetTitle>
            </SheetHeader>
            {renderCategoryTree(() => setShowCategorySheet(false))}
          </SheetContent>
        </Sheet>
      </div>

      {/* Split-Pane Layout: Left Category Tree + Right Items DataTable */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Pane: Category Tree (backed by PostgreSQL ltree) */}
        <div className="hidden lg:col-span-3 lg:block">
          <Card className="p-4">
            {renderCategoryTree()}
          </Card>
        </div>

        {/* Right Pane: Search & Filters + Items DataTable */}
        <div className="space-y-4 lg:col-span-9">
          <ListToolbar
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setPageIndex(0);
            }}
            searchPlaceholder="Search by SKU, item name, or description…"
            filters={
              <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto sm:flex-wrap">
                {(
                  [
                    { id: "all", label: "All Items" },
                    { id: "salable", label: "For Sale" },
                    { id: "purchaseable", label: "Purchased" },
                    { id: "trackable", label: "Serial Tracked" },
                    { id: "low_stock", label: "Low / Out of Stock" },
                  ] as const
                ).map((tab) => {
                  const active = quickFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setQuickFilter(tab.id);
                        setPageIndex(0);
                      }}
                      className={`h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-[12px] font-medium transition-colors ${
                        active
                          ? "border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                          : "border-[var(--border-subtle)] bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            }
            menuItems={
              hasFeature("IMPORT_EXPORT")
                ? [
                    {
                      key: "import",
                      label: showImporter ? "Hide Importer" : "Import CSV / XLSX",
                      icon: <FileSpreadsheet className="h-4 w-4 text-[var(--brand-primary)]" />,
                      onClick: () => setShowImporter((v) => !v),
                    },
                    {
                      key: "export",
                      label: "Export CSV",
                      icon: <Download className="h-4 w-4 text-[var(--text-secondary)]" />,
                      href: "/api/v1/parts/export?format=csv",
                    },
                  ]
                : []
            }
            hideActionsOnMobile
            primaryAction={
              hasPermission("PART:CREATE")
                ? {
                    label: "New Item",
                    onClick: openCreatePartModal,
                  }
                : undefined
            }
          />

          {/* Items Table */}
          {error ? (
            <ErrorState message={error} onRetry={loadParts} />
          ) : !loading && displayedParts.length === 0 ? (
            <EmptyState
              title="No items found"
              description="Add your first item or import a CSV/XLSX catalog to get started."
              action={
                hasPermission("PART:CREATE") && (
                  <button
                    type="button"
                    onClick={openCreatePartModal}
                    className="hidden h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-4 text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)] lg:inline-flex"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Item</span>
                  </button>
                )
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={displayedParts}
              isLoading={loading}
              enableRowSelection
              onSelectedRowsChange={setSelectedParts}
              pageIndex={pageIndex}
              pageSize={25}
              totalCount={
                quickFilter === "low_stock" ? displayedParts.length : partsPage?.totalElements
              }
              onPageChange={setPageIndex}
              renderMobileCard={(p) => {
                const summary = stockSummaries[p.id];
                const inStock = Number(summary?.inStock ?? 0);
                const minStock = Number(p.minimumStock ?? 0);
                const stockTone =
                  inStock <= 0
                    ? "danger"
                    : minStock > 0 && inStock < minStock
                      ? "warning"
                      : "success";
                return (
                  <Link href={`/parts/${p.id}`} className="block space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[12px] font-semibold text-[var(--brand-primary)]">
                          {p.ipn}
                        </span>
                        <div className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
                          {p.name}
                        </div>
                      </div>
                      <StatusBadge
                        label={`${inStock.toLocaleString()} ${p.unit}`}
                        tone={stockTone}
                        showDot={false}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--text-muted)]">
                      <span className="truncate">{p.categoryPathString ?? "Uncategorized"}</span>
                      <div className="flex items-center gap-1">
                        {p.purchaseable && <StatusBadge label="Buy" tone="success" showDot={false} />}
                        {p.salable && <StatusBadge label="Sell" tone="primary" showDot={false} />}
                        {p.trackable && <StatusBadge label="Serial" tone="violet" showDot={false} />}
                      </div>
                    </div>
                  </Link>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Mobile Floating New Item Button */}
      {hasPermission("PART:CREATE") && (
        <button
          type="button"
          onClick={openCreatePartModal}
          aria-label="New Item"
          title="New Item"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-lg transition-transform hover:bg-[var(--brand-primary-hover)] active:scale-95 lg:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar selectedCount={selectedCount} onClear={() => setSelectedParts([])}>
        <a
          href="/api/v1/parts/export?format=csv"
          className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white hover:bg-white/25"
        >
          Export CSV
        </a>
        <a
          href="/api/v1/parts/export?format=xlsx"
          className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-medium text-white hover:bg-white/25"
        >
          Export XLSX
        </a>
      </BulkActionBar>

      {/* Dialog: Create Item */}
      <Dialog open={showCreatePart} onOpenChange={setShowCreatePart}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePart} className="space-y-4">
            {partFormError && (
              <Alert variant="destructive">
                <AlertDescription>{partFormError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>SKU / Item Code *</Label>
                <Input
                  type="text"
                  required
                  value={partForm.ipn}
                  onChange={(e) => setPartForm({ ...partForm, ipn: e.target.value })}
                  placeholder="ITEM-001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Combobox
                  value={partForm.categoryId}
                  onValueChange={(val) => setPartForm({ ...partForm, categoryId: val })}
                  placeholder="Uncategorized"
                  searchPlaceholder="Search categories…"
                  options={[
                    { value: "", label: "Uncategorized" },
                    ...categories
                      .filter((c) => !c.structural)
                      .map((c) => ({ value: c.id, label: c.pathString })),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Item Name *</Label>
              <Input
                type="text"
                required
                value={partForm.name}
                onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                placeholder="e.g. Wireless Barcode Scanner"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Unit of Measure</Label>
                <Input
                  type="text"
                  value={partForm.unit}
                  onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                  placeholder="pcs, box, kg, L"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>Low Stock Alert Threshold</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={partForm.minimumStock}
                  onChange={(e) => setPartForm({ ...partForm, minimumStock: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description (Optional)</Label>
              <Input
                type="text"
                value={partForm.description}
                onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                placeholder="Short notes or product details"
              />
            </div>

            <div>
              <div className="mb-1.5 text-[12px] font-medium text-foreground">
                Item Options
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]">
                  <Checkbox
                    checked={partForm.purchaseable}
                    onCheckedChange={(v) =>
                      setPartForm({ ...partForm, purchaseable: Boolean(v) })
                    }
                  />
                  <span>We buy this</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]">
                  <Checkbox
                    checked={partForm.salable}
                    onCheckedChange={(v) =>
                      setPartForm({ ...partForm, salable: Boolean(v) })
                    }
                  />
                  <span>We sell this</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]">
                  <Checkbox
                    checked={partForm.trackable}
                    onCheckedChange={(v) =>
                      setPartForm({ ...partForm, trackable: Boolean(v) })
                    }
                  />
                  <span>Track serial numbers</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreatePart(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPart}>
                {submittingPart ? "Saving…" : "Save Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create / Edit / Move Category */}
      <Dialog
        open={Boolean(showCategoryModal)}
        onOpenChange={(open) => !open && setShowCategoryModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showCategoryModal?.mode === "create"
                ? "New Category"
                : showCategoryModal?.mode === "edit"
                  ? `Rename Category · ${showCategoryModal?.category?.name}`
                  : `Move Category · ${showCategoryModal?.category?.name}`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4">
            {catFormError && (
              <Alert variant="destructive">
                <AlertDescription>{catFormError}</AlertDescription>
              </Alert>
            )}

            {showCategoryModal?.mode !== "move" && (
              <>
                <div className="space-y-1">
                  <Label>Category Name *</Label>
                  <Input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Beverages, Electronics, Packaging"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description (Optional)</Label>
                  <Input
                    type="text"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Optional notes about this category"
                  />
                </div>
              </>
            )}

            {(showCategoryModal?.mode === "create" || showCategoryModal?.mode === "move") && (
              <div className="space-y-1">
                <Label>Parent Category</Label>
                <Combobox
                  value={catParentId}
                  onValueChange={setCatParentId}
                  placeholder="(Top-level category)"
                  searchPlaceholder="Search parent categories…"
                  options={[
                    { value: "", label: "(Top-level category)" },
                    ...categories
                      .filter((c) => c.id !== showCategoryModal?.category?.id)
                      .map((c) => ({ value: c.id, label: c.pathString })),
                  ]}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategoryModal(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Category */}
      <AlertDialog
        open={Boolean(deleteCategoryTarget)}
        onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong className="text-foreground">{deleteCategoryTarget?.name}</strong>? Child
              categories and items will be reparented.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCategoryTarget) {
                  handleDeleteCategory(deleteCategoryTarget);
                  setDeleteCategoryTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PartsCatalogPage() {
  return (
    <React.Suspense
      fallback={<div className="p-8 text-sm text-muted-foreground">Loading catalog...</div>}
    >
      <PartsCatalogPageContent />
    </React.Suspense>
  );
}
