"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  CategoryView,
  PageResponse,
  ParameterTemplateView,
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
import {
  ArrowRightLeft,
  Download,
  Edit3,
  FileSpreadsheet,
  Folder,
  FolderPlus,
  Filter,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

export default function PartsCatalogPage() {
  const searchParams = useSearchParams();
  const initialCatId = searchParams.get("categoryId");
  const { me, hasPermission, refetch } = useEntitlements();

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [templates, setTemplates] = useState<ParameterTemplateView[]>([]);
  const [partsPage, setPartsPage] = useState<PageResponse<PartView> | null>(null);
  const [stockSummaries, setStockSummaries] = useState<Record<string, StockSummaryView>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCatId);
  const [includeSubcategories, setIncludeSubcategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [flagAssembly, setFlagAssembly] = useState<boolean | null>(null);
  const [flagComponent, setFlagComponent] = useState<boolean | null>(null);
  const [flagTrackable, setFlagTrackable] = useState<boolean | null>(null);
  const [flagPurchaseable, setFlagPurchaseable] = useState<boolean | null>(null);
  const [flagSalable, setFlagSalable] = useState<boolean | null>(null);
  const [flagVirtual, setFlagVirtual] = useState<boolean | null>(null);

  // Parameter Range Filters
  const [paramTemplateId, setParamTemplateId] = useState<string>("");
  const [paramMin, setParamMin] = useState<string>("");
  const [paramMax, setParamMax] = useState<string>("");
  const [paramValueText, setParamValueText] = useState<string>("");

  const [pageIndex, setPageIndex] = useState(0);
  const [selectedParts, setSelectedParts] = useState<PartView[]>([]);
  const [showImporter, setShowImporter] = useState(false);

  // Modals
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState<
    null | { mode: "create" | "edit" | "move"; category?: CategoryView }
  >(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Part form state
  const [partForm, setPartForm] = useState({
    ipn: "",
    name: "",
    description: "",
    categoryId: "",
    revision: "A",
    unit: "pcs",
    minimumStock: "0",
    assembly: false,
    component: true,
    trackable: false,
    purchaseable: true,
    salable: false,
    virtual: false,
  });
  const [partFormError, setPartFormError] = useState<string | null>(null);
  const [submittingPart, setSubmittingPart] = useState(false);

  // Category form state
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catParentId, setCatParentId] = useState("");
  const [catStructural, setCatStructural] = useState(false);
  const [catFormError, setCatFormError] = useState<string | null>(null);

  // Parameter Template form state
  const [tplName, setTplName] = useState("");
  const [tplUnits, setTplUnits] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplChoices, setTplChoices] = useState("");
  const [tplCheckbox, setTplCheckbox] = useState(false);
  const [tplCategoryId, setTplCategoryId] = useState("");
  const [tplError, setTplError] = useState<string | null>(null);

  const loadMetadata = useCallback(async () => {
    try {
      const [cats, tpls] = await Promise.all([
        apiFetch<CategoryView[]>("/api/v1/part-categories"),
        apiFetch<ParameterTemplateView[]>("/api/v1/parameter-templates"),
      ]);
      setCategories(cats);
      setTemplates(tpls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog metadata");
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
      if (flagAssembly !== null) params.set("assembly", String(flagAssembly));
      if (flagComponent !== null) params.set("component", String(flagComponent));
      if (flagTrackable !== null) params.set("trackable", String(flagTrackable));
      if (flagPurchaseable !== null) params.set("purchaseable", String(flagPurchaseable));
      if (flagSalable !== null) params.set("salable", String(flagSalable));
      if (flagVirtual !== null) params.set("virtual", String(flagVirtual));
      if (paramTemplateId) {
        params.set("paramTemplateId", paramTemplateId);
        if (paramMin.trim()) params.set("paramMin", paramMin.trim());
        if (paramMax.trim()) params.set("paramMax", paramMax.trim());
        if (paramValueText.trim()) params.set("paramValueText", paramValueText.trim());
      }

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
      setError(err instanceof Error ? err.message : "Failed to load parts");
    } finally {
      setLoading(false);
    }
  }, [
    pageIndex,
    searchQuery,
    selectedCategoryId,
    includeSubcategories,
    flagAssembly,
    flagComponent,
    flagTrackable,
    flagPurchaseable,
    flagSalable,
    flagVirtual,
    paramTemplateId,
    paramMin,
    paramMax,
    paramValueText,
  ]);

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

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === paramTemplateId) ?? null,
    [templates, paramTemplateId]
  );

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
          revision: partForm.revision || "A",
          unit: partForm.unit || "pcs",
          minimumStock: Number(partForm.minimumStock || 0),
          assembly: partForm.assembly,
          component: partForm.component,
          trackable: partForm.trackable,
          purchaseable: partForm.purchaseable,
          salable: partForm.salable,
          virtual: partForm.virtual,
        }),
      });
      setShowCreatePart(false);
      setPartForm({
        ipn: "",
        name: "",
        description: "",
        categoryId: selectedCategory && !selectedCategory.structural ? selectedCategory.id : "",
        revision: "A",
        unit: "pcs",
        minimumStock: "0",
        assembly: false,
        component: true,
        trackable: false,
        purchaseable: true,
        salable: false,
        virtual: false,
      });
      await Promise.all([loadParts(), loadMetadata()]);
      refetch();
    } catch (err) {
      setPartFormError(err instanceof Error ? err.message : "Failed to create part");
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
            structural: catStructural,
          }),
        });
      } else if (showCategoryModal.mode === "edit" && showCategoryModal.category) {
        await apiFetch<CategoryView>(`/api/v1/part-categories/${showCategoryModal.category.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: catName,
            description: catDesc || null,
            structural: catStructural,
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

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    setTplError(null);
    try {
      await apiFetch<ParameterTemplateView>("/api/v1/parameter-templates", {
        method: "POST",
        body: JSON.stringify({
          name: tplName,
          units: tplUnits || null,
          description: tplDesc || null,
          choices: tplChoices || null,
          checkbox: tplCheckbox,
          defaultCategoryId: tplCategoryId || null,
        }),
      });
      setTplName("");
      setTplUnits("");
      setTplDesc("");
      setTplChoices("");
      setTplCheckbox(false);
      setTplCategoryId("");
      await loadMetadata();
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Failed to create parameter template");
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await apiFetch<void>(`/api/v1/parameter-templates/${id}`, { method: "DELETE" });
      if (paramTemplateId === id) {
        setParamTemplateId("");
      }
      await loadMetadata();
    } catch (err) {
      setTplError(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  const columns = useMemo<ColumnDef<PartView, unknown>[]>(
    () => [
      {
        accessorKey: "ipn",
        header: "IPN / Rev",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/parts/${row.original.id}`}
              className="font-mono text-[13px] font-medium text-[#1D4ED8] hover:underline"
            >
              {row.original.ipn}
            </Link>
            <span className="rounded border border-[#E4E4E7] bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[11px] text-[#52525B]">
              Rev {row.original.revision}
            </span>
            {row.original.locked && (
              <span title="Locked">
                <Lock className="h-3.5 w-3.5 text-[#92400E]" />
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Part Name",
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/parts/${row.original.id}`}
                className="text-[13px] font-medium text-[#18181B] hover:text-[#1D4ED8]"
              >
                {row.original.name}
              </Link>
              {row.original.variantOfId && (
                <StatusBadge label="Variant" tone="violet" showDot={false} />
              )}
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
        id: "flags",
        header: "Engineering Flags",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              {p.assembly && <StatusBadge label="ASM" tone="primary" showDot={false} />}
              {p.component && <StatusBadge label="CMP" tone="neutral" showDot={false} />}
              {p.trackable && <StatusBadge label="TRK" tone="violet" showDot={false} />}
              {p.purchaseable && <StatusBadge label="PUR" tone="success" showDot={false} />}
              {p.salable && <StatusBadge label="SAL" tone="warning" showDot={false} />}
              {p.virtual && <StatusBadge label="VRT" tone="danger" showDot={false} />}
            </div>
          );
        },
      },
      {
        id: "parameters",
        header: "Parameters",
        cell: ({ row }) => {
          const params = row.original.parameters ?? [];
          if (params.length === 0) {
            return <span className="text-[12px] text-[#63636B]">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {params.slice(0, 3).map((pp) => (
                <span
                  key={pp.id}
                  className="rounded border border-[#E4E4E7] bg-[#F7F7F8] px-1.5 py-0.5 font-mono text-[11px] text-[#18181B]"
                >
                  {pp.templateName}: {pp.valueText}
                </span>
              ))}
              {params.length > 3 && (
                <span className="text-[11px] text-[#63636B]">+{params.length - 3}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "minimumStock",
        header: () => <div className="text-right">In Stock / Min</div>,
        cell: ({ row }) => {
          const p = row.original;
          const summary = stockSummaries[p.id];
          const inStock = Number(summary?.inStock ?? 0);
          const minStock = Number(p.minimumStock ?? 0);
          const tone =
            inStock <= 0
              ? "danger"
              : minStock > 0 && inStock < minStock
                ? "warning"
                : "success";
          return (
            <div className="flex items-center justify-end gap-2 font-mono text-[12px] tabular-nums">
              <StatusBadge
                label={`${inStock.toLocaleString()} ${p.unit}`}
                tone={tone}
              />
              <span className="text-[#63636B]">/ {minStock.toLocaleString()}</span>
            </div>
          );
        },
      },
    ],
    [stockSummaries]
  );

  const selectedCount = selectedParts.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
            Parts Catalog
          </h1>
          <p className="mt-0.5 text-[14px] text-[#52525B]">
            Hierarchical <code className="font-mono text-[12px]">ltree</code> categories, revisions,
            variants, and unit-normalized engineering parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTemplatesModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#1D4ED8]" />
            <span>Parameter Templates ({templates.length})</span>
          </button>

          <FeatureGate feature="IMPORT_EXPORT">
            <button
              type="button"
              onClick={() => setShowImporter((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#1D4ED8]" />
              <span>{showImporter ? "Hide Importer" : "Import CSV / XLSX"}</span>
            </button>

            <a
              href="/api/v1/parts/export?format=csv"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
            >
              <Download className="h-4 w-4 text-[#52525B]" />
              <span>Export CSV</span>
            </a>
          </FeatureGate>

          {hasPermission("PART:CREATE") && (
            <button
              type="button"
              onClick={() => {
                setPartFormError(null);
                setPartForm((prev) => ({
                  ...prev,
                  categoryId:
                    selectedCategory && !selectedCategory.structural ? selectedCategory.id : "",
                }));
                setShowCreatePart(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-3.5 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              <Plus className="h-4 w-4" />
              <span>New Part</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Catalog Parts"
          value={`${partsPage?.totalElements ?? me?.usage?.MAX_PARTS ?? 0} / ${me?.limits?.MAX_PARTS ?? "—"}`}
          hint="Active parts vs plan quota"
        />
        <StatTile
          label="Category Nodes"
          value={categories.length}
          hint={`${categories.filter((c) => c.structural).length} structural · ${categories.filter((c) => !c.structural).length} assignable`}
        />
        <StatTile
          label="Parameter Templates"
          value={templates.length}
          hint="JSR-385 Indriya unit-normalized"
        />
        <StatTile
          label="Active Scope"
          value={selectedCategory ? selectedCategory.name : "All Categories"}
          hint={selectedCategory ? selectedCategory.pathString : "Showing entire catalog"}
        />
      </div>

      {/* Optional Import Wizard Drawer */}
      {showImporter && (
        <div className="space-y-2">
          <ImportWizard
            targetType="PART"
            targetFields={[
              { key: "ipn", label: "Internal Part Number (IPN)", required: true },
              { key: "name", label: "Part Name", required: true },
              { key: "revision", label: "Revision (default A)", required: false },
              { key: "description", label: "Description", required: false },
              { key: "category", label: "Category Name / Path", required: false },
              { key: "unit", label: "Unit of Measure (pcs, m, g)", required: false },
              { key: "minimumStock", label: "Minimum Stock", required: false },
              { key: "assembly", label: "Assembly (true/false)", required: false },
              { key: "component", label: "Component (true/false)", required: false },
              { key: "trackable", label: "Trackable (true/false)", required: false },
              { key: "purchaseable", label: "Purchaseable (true/false)", required: false },
              { key: "salable", label: "Salable (true/false)", required: false },
              { key: "virtual", label: "Virtual (true/false)", required: false },
            ]}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowImporter(false);
                loadParts();
                refetch();
              }}
              className="rounded-[8px] border border-[#E4E4E7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
            >
              Done & Refresh Table
            </button>
          </div>
        </div>
      )}

      {/* Split-Pane Layout: Left Category Tree + Right Parts DataTable */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Pane: Category Tree */}
        <div className="lg:col-span-3">
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-4">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <div className="text-[14px] font-semibold text-[#18181B]">Categories</div>
                <div className="text-[11px] text-[#63636B]">PostgreSQL ltree hierarchy</div>
              </div>
              {hasPermission("PART:CREATE") && (
                <button
                  type="button"
                  onClick={() => {
                    setCatName("");
                    setCatDesc("");
                    setCatParentId(selectedCategoryId ?? "");
                    setCatStructural(false);
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
              <span>Include descendant subcategories</span>
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
                  {categories.length}
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
                        <Folder
                          className={`h-3.5 w-3.5 shrink-0 ${
                            cat.structural ? "text-[#92400E]" : "text-[#1D4ED8]"
                          }`}
                        />
                        <span className="truncate">{cat.name}</span>
                        {cat.structural && (
                          <span className="rounded bg-[#FEF3C7] px-1 py-0.2 text-[10px] font-medium text-[#92400E]">
                            Struct
                          </span>
                        )}
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
                <div className="font-mono text-[11px] text-[#63636B]">
                  ltree: {selectedCategory.path}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCatName(selectedCategory.name);
                      setCatDesc(selectedCategory.description ?? "");
                      setCatStructural(selectedCategory.structural);
                      setCatFormError(null);
                      setShowCategoryModal({ mode: "edit", category: selectedCategory });
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded border border-[#E4E4E7] bg-white px-2 text-[11px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
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
                    <span>Move Subtree</span>
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
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Filters + Parts DataTable */}
        <div className="space-y-4 lg:col-span-9">
          {/* Search + Boolean Flag Chips + Parameter Range Filter Card */}
          <div className="space-y-3 rounded-[12px] border border-[#E4E4E7] bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#63636B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder="Filter by IPN, name, or description…"
                  className="h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] pr-3 pl-9 text-[13px] text-[#18181B] placeholder:text-[#63636B] focus:border-[#1D4ED8] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Boolean Flag Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "Assembly", val: flagAssembly, set: setFlagAssembly },
                  { label: "Component", val: flagComponent, set: setFlagComponent },
                  { label: "Trackable", val: flagTrackable, set: setFlagTrackable },
                  { label: "Purchaseable", val: flagPurchaseable, set: setFlagPurchaseable },
                  { label: "Salable", val: flagSalable, set: setFlagSalable },
                  { label: "Virtual", val: flagVirtual, set: setFlagVirtual },
                ].map((chip) => {
                  const active = chip.val === true;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        chip.set(active ? null : true);
                        setPageIndex(0);
                      }}
                      className={`h-8 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                        active
                          ? "border-[#1D4ED8] bg-[#EEF2FF] text-[#1D4ED8]"
                          : "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F7F7F8]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typed Parameter Range Filter Row */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#E4E4E7] pt-3">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#52525B]">
                <Filter className="h-3.5 w-3.5 text-[#1D4ED8]" />
                <span>Parameter Range Filter:</span>
              </span>

              <select
                value={paramTemplateId}
                onChange={(e) => {
                  setParamTemplateId(e.target.value);
                  setParamMin("");
                  setParamMax("");
                  setParamValueText("");
                  setPageIndex(0);
                }}
                aria-label="Parameter template filter"
                className="h-8 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[12px] text-[#18181B]"
              >
                <option value="">Any parameter…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.units ? `(${t.units})` : t.checkbox ? "(Boolean)" : ""}
                  </option>
                ))}
              </select>

              {selectedTemplate && !selectedTemplate.checkbox && (
                <>
                  <input
                    type="text"
                    value={paramMin}
                    onChange={(e) => {
                      setParamMin(e.target.value);
                      setPageIndex(0);
                    }}
                    placeholder={
                      selectedTemplate.units
                        ? `Min (e.g. 1${selectedTemplate.units})`
                        : "Min numeric"
                    }
                    className="h-8 w-36 rounded-[8px] border border-[#E4E4E7] px-2.5 font-mono text-[12px]"
                  />
                  <span className="text-[12px] text-[#63636B]">to</span>
                  <input
                    type="text"
                    value={paramMax}
                    onChange={(e) => {
                      setParamMax(e.target.value);
                      setPageIndex(0);
                    }}
                    placeholder={
                      selectedTemplate.units
                        ? `Max (e.g. 10${selectedTemplate.units})`
                        : "Max numeric"
                    }
                    className="h-8 w-36 rounded-[8px] border border-[#E4E4E7] px-2.5 font-mono text-[12px]"
                  />
                </>
              )}

              {selectedTemplate && (
                <input
                  type="text"
                  value={paramValueText}
                  onChange={(e) => {
                    setParamValueText(e.target.value);
                    setPageIndex(0);
                  }}
                  placeholder={selectedTemplate.checkbox ? "true / false" : "Text match…"}
                  className="h-8 w-32 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
                />
              )}

              {paramTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setParamTemplateId("");
                    setParamMin("");
                    setParamMax("");
                    setParamValueText("");
                    setPageIndex(0);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] px-2 text-[12px] text-[#63636B] hover:bg-[#F7F7F8]"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Parts Table */}
          {error ? (
            <ErrorState message={error} onRetry={loadParts} />
          ) : !loading && (partsPage?.content.length ?? 0) === 0 ? (
            <EmptyState
              title="No parts match the current filter"
              description={
                selectedCategory?.structural
                  ? `Category "${selectedCategory.name}" is marked structural and only holds child categories.`
                  : "Create your first part or import a CSV/XLSX catalog to populate this view."
              }
              action={
                hasPermission("PART:CREATE") && (
                  <button
                    type="button"
                    onClick={() => setShowCreatePart(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Part</span>
                  </button>
                )
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={partsPage?.content ?? []}
              isLoading={loading}
              enableRowSelection
              onSelectedRowsChange={setSelectedParts}
              pageIndex={pageIndex}
              pageSize={25}
              totalCount={partsPage?.totalElements}
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

      {/* Modal: Create Part */}
      {showCreatePart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">Create New Part</h2>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    IPN (Part Number) *
                  </label>
                  <input
                    type="text"
                    required
                    value={partForm.ipn}
                    onChange={(e) => setPartForm({ ...partForm, ipn: e.target.value })}
                    placeholder="CAP-0402-10U"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Revision</label>
                  <input
                    type="text"
                    value={partForm.revision}
                    onChange={(e) => setPartForm({ ...partForm, revision: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={partForm.unit}
                    onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                    placeholder="pcs"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Part Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={partForm.name}
                    onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                    placeholder="MLCC Capacitor 10uF 16V X5R"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Category (Non-structural)
                  </label>
                  <select
                    value={partForm.categoryId}
                    onChange={(e) => setPartForm({ ...partForm, categoryId: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.structural}>
                        {c.pathString} {c.structural ? "(Structural - no direct parts)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Description
                  </label>
                  <input
                    type="text"
                    value={partForm.description}
                    onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                    placeholder="Optional engineering specification"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Minimum Stock Threshold
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={partForm.minimumStock}
                    onChange={(e) => setPartForm({ ...partForm, minimumStock: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>

              {/* Engineering Flags */}
              <div>
                <div className="mb-1.5 text-[12px] font-medium text-[#18181B]">
                  Engineering Classification Flags
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { key: "assembly", label: "Assembly (has BOM)" },
                    { key: "component", label: "Component (used in BOM)" },
                    { key: "trackable", label: "Trackable (serialized)" },
                    { key: "purchaseable", label: "Purchaseable (from vendor)" },
                    { key: "salable", label: "Salable (customer order)" },
                    { key: "virtual", label: "Virtual (non-physical)" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] px-2.5 py-1.5 text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(partForm[f.key as keyof typeof partForm])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (f.key === "virtual" && checked) {
                            setPartForm({
                              ...partForm,
                              virtual: true,
                              purchaseable: false,
                            });
                          } else {
                            setPartForm({ ...partForm, [f.key]: checked });
                          }
                        }}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
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
                  {submittingPart ? "Creating…" : "Create Part"}
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
                  ? "New Part Category"
                  : showCategoryModal.mode === "edit"
                    ? `Edit Category · ${showCategoryModal.category?.name}`
                    : `Move Subtree · ${showCategoryModal.category?.name}`}
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
                      placeholder="Passives"
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#18181B]">
                      Description
                    </label>
                    <input
                      type="text"
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                    />
                  </div>
                  <label className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] p-2.5 text-[12px]">
                    <input
                      type="checkbox"
                      checked={catStructural}
                      onChange={(e) => setCatStructural(e.target.checked)}
                    />
                    <span>
                      <strong>Structural category</strong> (organizes subcategories only; rejects
                      direct part assignment)
                    </span>
                  </label>
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
                    <option value="">(Root level)</option>
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

      {/* Modal: Parameter Templates Manager */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#18181B]">
                  Typed Parameter Templates (Indriya JSR-385)
                </h2>
                <p className="text-[12px] text-[#52525B]">
                  Define physical units (e.g., <code className="font-mono">F</code>,{" "}
                  <code className="font-mono">Ohm</code>, <code className="font-mono">V</code>,{" "}
                  <code className="font-mono">A</code>, <code className="font-mono">Hz</code>,{" "}
                  <code className="font-mono">mm</code>) for SI-normalized range queries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tplError && (
              <div className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                {tplError}
              </div>
            )}

            {hasPermission("PART:CREATE") && (
              <form
                onSubmit={handleCreateTemplate}
                className="mt-4 grid grid-cols-1 gap-2.5 rounded-[10px] border border-[#E4E4E7] bg-[#F7F7F8] p-3 sm:grid-cols-6"
              >
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Name (e.g. Capacitance)"
                  className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[12px] sm:col-span-2"
                />
                <input
                  type="text"
                  value={tplUnits}
                  onChange={(e) => setTplUnits(e.target.value)}
                  placeholder="Unit (F, Ohm, V, mA)"
                  disabled={tplCheckbox}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 font-mono text-[12px]"
                />
                <input
                  type="text"
                  value={tplChoices}
                  onChange={(e) => setTplChoices(e.target.value)}
                  placeholder="Choices (0402,0603)"
                  disabled={tplCheckbox}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[12px]"
                />
                <label className="flex items-center gap-1.5 px-1 text-[12px]">
                  <input
                    type="checkbox"
                    checked={tplCheckbox}
                    onChange={(e) => setTplCheckbox(e.target.checked)}
                  />
                  <span>Checkbox</span>
                </label>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white hover:bg-[#1E40AF]"
                >
                  + Add
                </button>
              </form>
            )}

            <div className="mt-4 max-h-72 overflow-y-auto rounded-[8px] border border-[#E4E4E7]">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-[#F7F7F8] text-[#52525B]">
                  <tr className="border-b border-[#E4E4E7]">
                    <th className="px-3 py-2 font-semibold">Template Name</th>
                    <th className="px-3 py-2 font-semibold">Unit / Type</th>
                    <th className="px-3 py-2 font-semibold">Allowed Choices</th>
                    <th className="px-3 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-[#63636B]">
                        No parameter templates defined yet.
                      </td>
                    </tr>
                  ) : (
                    templates.map((t) => (
                      <tr key={t.id}>
                        <td className="px-3 py-2 font-medium text-[#18181B]">{t.name}</td>
                        <td className="px-3 py-2 font-mono text-[#1D4ED8]">
                          {t.checkbox ? "Boolean" : t.units || "Text / Number"}
                        </td>
                        <td className="px-3 py-2 text-[#52525B]">{t.choices || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {hasPermission("PART:DELETE") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="text-[#991B1B] hover:underline"
                            >
                              Delete
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
        </div>
      )}
    </div>
  );
}
