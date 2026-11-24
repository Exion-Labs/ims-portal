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
  BulkActionBar,
  DataTable,
  EmptyState,
  ErrorState,
  ImportWizard,
  StatTile,
  StatusBadge,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { useEditMode } from "@/lib/edit-mode";
import { EditModeHint } from "@/components/edit-mode-hint";
import { ListToolbar } from "@/components/list-toolbar";
import {
  ArrowRightLeft,
  Download,
  Edit3,
  FileSpreadsheet,
  Folder,
  FolderPlus,
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

  // Modals
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState<
    null | { mode: "create" | "edit" | "move"; category?: CategoryView }
  >(null);

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
    } finally {
      setSubmittingPart(false);
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!showCategoryModal) return;
    setCatFormError(null);
    try {
      if (showCategoryModal.mode === "create") {
        await apiFetch<CategoryView>("/api/v1/part-categories", {
          method: "POST",
          body: JSON.stringify({
            name: catName,
            description: catDesc || null,
            parentId: catParentId || null,
            structural: false,
          }),
        });
      } else if (showCategoryModal.mode === "edit" && showCategoryModal.category) {
        await apiFetch<CategoryView>(`/api/v1/part-categories/${showCategoryModal.category.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: catName,
            description: catDesc || null,
            structural: showCategoryModal.category.structural,
          }),
        });
      } else if (showCategoryModal.mode === "move" && showCategoryModal.category) {
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
      await Promise.all([loadMetadata(), loadParts()]);
    } catch (err) {
      setCatFormError(err instanceof Error ? err.message : "Category operation failed");
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
      await Promise.all([loadMetadata(), loadParts()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
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
            className="font-mono text-[13px] font-medium text-[#1D4ED8] hover:underline"
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
                className="text-[13px] font-medium text-[#18181B] hover:text-[#1D4ED8]"
              >
                {row.original.name}
              </Link>
              {!row.original.active && (
                <StatusBadge label="Inactive" tone="neutral" showDot={false} />
              )}
            </div>
            {row.original.description && (
              <div className="mt-0.5 max-w-md truncate text-[12px] text-[#63636B]">
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
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F4F4F5] px-2 py-0.5 text-[12px] text-[#52525B]">
              <Folder className="h-3 w-3 text-[#63636B]" />
              <span>{row.original.categoryPathString}</span>
            </span>
          ) : (
            <span className="text-[12px] text-[#63636B]">Uncategorized</span>
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
              ? "text-[#991B1B]"
              : minStock > 0 && inStock < minStock
                ? "text-[#92400E]"
                : "text-[#166534]";
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

  return (
    <div className="space-y-4">
      {/* Modal: Import Wizard */}
      {showImporter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowImporter(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">Import Items (CSV / XLSX)</h2>
              <button
                type="button"
                onClick={() => setShowImporter(false)}
                aria-label="Close importer"
                className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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

            <div className="mt-4 flex justify-end border-t border-[#E4E4E7] pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowImporter(false);
                  loadParts();
                  refetch();
                }}
                className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
              >
                Done & Refresh Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split-Pane Layout: Left Category Tree + Right Items DataTable */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Pane: Category Tree (backed by PostgreSQL ltree) */}
        <div className="lg:col-span-3">
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-4">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <div className="text-[14px] font-semibold text-[#18181B]">Categories</div>
                <div className="text-[11px] text-[#63636B]">Filter items by folder</div>
              </div>
              {hasPermission("PART:CREATE") && editMode && (
                <button
                  type="button"
                  onClick={() => {
                    setCatName("");
                    setCatDesc("");
                    setCatParentId(selectedCategoryId ?? "");
                    setCatFormError(null);
                    setShowCategoryModal({ mode: "create" });
                  }}
                  title="New Category"
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-2.5 text-[12px] font-medium text-[#18181B] hover:border-[#1D4ED8]"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-[#1D4ED8]" />
                  <span>New</span>
                </button>
              )}
            </div>

            {/* Include Subcategories Toggle */}
            <label className="mt-3 flex items-center gap-2 text-[12px] text-[#52525B]">
              <input
                type="checkbox"
                checked={includeSubcategories}
                onChange={(e) => {
                  setIncludeSubcategories(e.target.checked);
                  setPageIndex(0);
                }}
                className="rounded border-[#E4E4E7]"
              />
              <span>Include subcategories</span>
            </label>

            {/* Tree Navigation */}
            <div className="mt-3 max-h-[500px] space-y-0.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setPageIndex(0);
                }}
                className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[13px] font-medium ${
                  selectedCategoryId === null
                    ? "bg-[#EEF2FF] text-[#1D4ED8]"
                    : "text-[#18181B] hover:bg-[#F7F7F8]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5" />
                  <span>All Categories</span>
                </span>
                <span className="font-mono text-[11px] text-[#63636B]">
                  {me?.usage?.MAX_PARTS ?? partsPage?.totalElements ?? 0}
                </span>
              </button>

              {categories.map((cat) => {
                const active = selectedCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    style={{ paddingLeft: `${Math.min(cat.depth, 6) * 14}px` }}
                    className="group flex items-center justify-between rounded-[8px] pr-1 hover:bg-[#F7F7F8]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setPageIndex(0);
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-between rounded-[8px] px-2 py-1.5 text-left text-[13px] ${
                        active ? "bg-[#EEF2FF] font-semibold text-[#1D4ED8]" : "text-[#18181B]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-[#1D4ED8]" />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="ml-1 font-mono text-[11px] text-[#63636B]">
                        {cat.directPartCount}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selected Category Action Footer */}
            {selectedCategory && (
              <div className="mt-4 space-y-2 border-t border-[#E4E4E7] pt-3">
                <div className="text-[12px] font-medium text-[#18181B]">
                  {selectedCategory.pathString}
                </div>
                {selectedCategory.description && (
                  <div className="text-[11px] text-[#63636B]">{selectedCategory.description}</div>
                )}
                {editMode ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCatName(selectedCategory.name);
                        setCatDesc(selectedCategory.description ?? "");
                        setCatFormError(null);
                        setShowCategoryModal({ mode: "edit", category: selectedCategory });
                      }}
                      className="inline-flex h-7 items-center gap-1 rounded border border-[#E4E4E7] bg-white px-2 text-[11px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatParentId(selectedCategory.parentId ?? "");
                        setCatFormError(null);
                        setShowCategoryModal({ mode: "move", category: selectedCategory });
                      }}
                      className="inline-flex h-7 items-center gap-1 rounded border border-[#E4E4E7] bg-white px-2 text-[11px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Move</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(selectedCategory)}
                      className="inline-flex h-7 items-center gap-1 rounded border border-[#FECACA] bg-[#FEE2E2]/40 px-2 text-[11px] font-medium text-[#991B1B] hover:bg-[#FEE2E2]"
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
          </div>
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
              <div className="flex flex-wrap items-center gap-1.5">
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
                      className={`h-8 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                        active
                          ? "border-[#1D4ED8] bg-[#EEF2FF] text-[#1D4ED8]"
                          : "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F7F7F8]"
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
                      icon: <FileSpreadsheet className="h-4 w-4 text-[#1D4ED8]" />,
                      onClick: () => setShowImporter((v) => !v),
                    },
                    {
                      key: "export",
                      label: "Export CSV",
                      icon: <Download className="h-4 w-4 text-[#52525B]" />,
                      href: "/api/v1/parts/export?format=csv",
                    },
                  ]
                : []
            }
            primaryAction={
              hasPermission("PART:CREATE")
                ? {
                    label: "New Item",
                    onClick: () => {
                      setPartFormError(null);
                      setPartForm((prev) => ({
                        ...prev,
                        categoryId:
                          selectedCategory && !selectedCategory.structural
                            ? selectedCategory.id
                            : "",
                      }));
                      setShowCreatePart(true);
                    },
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
                    onClick={() => setShowCreatePart(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
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
            />
          )}
        </div>
      </div>

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

      {/* Modal: Create Item */}
      {showCreatePart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">Add New Item</h2>
              <button
                type="button"
                onClick={() => setShowCreatePart(false)}
                className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePart} className="mt-4 space-y-4">
              {partFormError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {partFormError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    SKU / Item Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={partForm.ipn}
                    onChange={(e) => setPartForm({ ...partForm, ipn: e.target.value })}
                    placeholder="ITEM-001"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Category
                  </label>
                  <select
                    value={partForm.categoryId}
                    onChange={(e) => setPartForm({ ...partForm, categoryId: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="">Uncategorized</option>
                    {categories
                      .filter((c) => !c.structural)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.pathString}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={partForm.name}
                  onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                  placeholder="e.g. Wireless Barcode Scanner"
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={partForm.unit}
                    onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                    placeholder="pcs, box, kg, L"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={partForm.minimumStock}
                    onChange={(e) => setPartForm({ ...partForm, minimumStock: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={partForm.description}
                  onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  placeholder="Short notes or product details"
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                />
              </div>

              {/* Simplified Business Options */}
              <div>
                <div className="mb-1.5 text-[12px] font-medium text-[#18181B]">
                  Item Options
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] px-3 py-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={partForm.purchaseable}
                      onChange={(e) =>
                        setPartForm({ ...partForm, purchaseable: e.target.checked })
                      }
                    />
                    <span>We buy this</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] px-3 py-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={partForm.salable}
                      onChange={(e) => setPartForm({ ...partForm, salable: e.target.checked })}
                    />
                    <span>We sell this</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] px-3 py-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={partForm.trackable}
                      onChange={(e) =>
                        setPartForm({ ...partForm, trackable: e.target.checked })
                      }
                    />
                    <span>Track serial numbers</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePart(false)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px] font-medium text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPart}
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {submittingPart ? "Saving…" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit / Move Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">
                {showCategoryModal.mode === "create"
                  ? "New Category"
                  : showCategoryModal.mode === "edit"
                    ? `Rename Category · ${showCategoryModal.category?.name}`
                    : `Move Category · ${showCategoryModal.category?.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setShowCategoryModal(null)}
                className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              {catFormError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {catFormError}
                </div>
              )}

              {showCategoryModal.mode !== "move" && (
                <>
                  <div>
                    <label className="block text-[12px] font-medium text-[#18181B]">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Beverages, Electronics, Packaging"
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#18181B]">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Optional notes about this category"
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                    />
                  </div>
                </>
              )}

              {(showCategoryModal.mode === "create" || showCategoryModal.mode === "move") && (
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Parent Category
                  </label>
                  <select
                    value={catParentId}
                    onChange={(e) => setCatParentId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="">(Top-level category)</option>
                    {categories
                      .filter((c) => c.id !== showCategoryModal.category?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.pathString}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(null)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px] font-medium text-[#52525B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
