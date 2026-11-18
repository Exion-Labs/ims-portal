"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  apiFetch,
  AttachmentView,
  CategoryView,
  CompanyView,
  ManufacturerPartView,
  NoteView,
  PageResponse,
  ParameterTemplateView,
  PartView,
  StockSummaryView,
  SupplierPartView,
} from "@ims/api-client";
import { EmptyState, ErrorState, StatTile, StatusBadge } from "@ims/ui";
import { useEntitlements } from "@/lib/entitlements";
import {
  ArrowLeft,
  Cpu,
  Edit3,
  FileText,
  Folder,
  GitBranch,
  Layers,
  Lock,
  Paperclip,
  Plus,
  SlidersHorizontal,
  Trash2,
  Unlock,
  X,
  Building2,
} from "lucide-react";

type DetailTab = "overview" | "parameters" | "suppliers" | "variants" | "notes";

export default function PartDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const partId = params.id;
  const { hasPermission } = useEntitlements();

  const [part, setPart] = useState<PartView | null>(null);
  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [templates, setTemplates] = useState<ParameterTemplateView[]>([]);
  const [variants, setVariants] = useState<PartView[]>([]);
  const [revisions, setRevisions] = useState<PartView[]>([]);
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [attachments, setAttachments] = useState<AttachmentView[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummaryView | null>(null);
  const [supplierParts, setSupplierParts] = useState<SupplierPartView[]>([]);
  const [manufacturerParts, setManufacturerParts] = useState<ManufacturerPartView[]>([]);
  const [companies, setCompanies] = useState<CompanyView[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add/Update Parameter state
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [paramValue, setParamValue] = useState("");
  const [paramError, setParamError] = useState<string | null>(null);
  const [savingParam, setSavingParam] = useState(false);

  // Variant / Revision creation modal
  const [childModal, setChildModal] = useState<null | "variant" | "revision">(null);
  const [childIpn, setChildIpn] = useState("");
  const [childName, setChildName] = useState("");
  const [childRevision, setChildRevision] = useState("");
  const [childError, setChildError] = useState<string | null>(null);

  // Edit Part modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    ipn: "",
    name: "",
    description: "",
    categoryId: "",
    revision: "",
    unit: "",
    minimumStock: "0",
    active: true,
    assembly: false,
    component: true,
    trackable: false,
    purchaseable: true,
    salable: false,
    virtual: false,
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Note form
  const [noteContent, setNoteContent] = useState("");
  const [attachmentFileName, setAttachmentFileName] = useState("");
  const [attachmentComment, setAttachmentComment] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, cats, tpls, vars, revs, nts, atts, summary, sps, mps, comps] = await Promise.all([
        apiFetch<PartView>(`/api/v1/parts/${partId}`),
        apiFetch<CategoryView[]>("/api/v1/part-categories"),
        apiFetch<ParameterTemplateView[]>("/api/v1/parameter-templates"),
        apiFetch<PartView[]>(`/api/v1/parts/${partId}/variants`),
        apiFetch<PartView[]>(`/api/v1/parts/${partId}/revisions`),
        apiFetch<NoteView[]>(`/api/v1/notes?entityType=Part&entityId=${partId}`),
        apiFetch<AttachmentView[]>(`/api/v1/attachments?entityType=Part&entityId=${partId}`),
        apiFetch<StockSummaryView>(`/api/v1/parts/${partId}/stock-summary`).catch(() => null),
        apiFetch<SupplierPartView[]>(`/api/v1/parts/${partId}/supplier-parts`).catch(() => []),
        apiFetch<ManufacturerPartView[]>(`/api/v1/parts/${partId}/manufacturer-parts`).catch(() => []),
        apiFetch<PageResponse<CompanyView>>("/api/v1/companies?size=200").catch(() => ({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 200,
        })),
      ]);
      setPart(p);
      setCategories(cats);
      setTemplates(tpls);
      setVariants(vars);
      setRevisions(revs);
      setNotes(nts);
      setAttachments(atts);
      setStockSummary(summary);
      setSupplierParts(sps);
      setManufacturerParts(mps);
      setCompanies(comps.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load part details");
    } finally {
      setLoading(false);
    }
  }, [partId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleToggleLock() {
    if (!part) return;
    try {
      const updated = await apiFetch<PartView>(`/api/v1/parts/${part.id}`, {
        method: "PUT",
        body: JSON.stringify({ locked: !part.locked }),
      });
      setPart(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lock status");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!part) return;
    setEditError(null);
    try {
      const updated = await apiFetch<PartView>(`/api/v1/parts/${part.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ipn: editForm.ipn,
          name: editForm.name,
          description: editForm.description,
          categoryId: editForm.categoryId || null,
          revision: editForm.revision,
          unit: editForm.unit,
          minimumStock: Number(editForm.minimumStock || 0),
          active: editForm.active,
          assembly: editForm.assembly,
          component: editForm.component,
          trackable: editForm.trackable,
          purchaseable: editForm.purchaseable,
          salable: editForm.salable,
          virtual: editForm.virtual,
        }),
      });
      setPart(updated);
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update part");
    }
  }

  async function handleUpsertParameter(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !selectedTemplateId) return;
    setParamError(null);
    setSavingParam(true);
    try {
      await apiFetch(`/api/v1/parts/${part.id}/parameters`, {
        method: "POST",
        body: JSON.stringify({
          templateId: selectedTemplateId,
          value: paramValue,
        }),
      });
      setParamValue("");
      await loadAll();
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Failed to save parameter");
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
      await loadAll();
    } catch (err) {
      setParamError(err instanceof Error ? err.message : "Failed to delete parameter");
    }
  }

  async function handleCreateChildPart(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !childModal) return;
    setChildError(null);
    try {
      const created = await apiFetch<PartView>("/api/v1/parts", {
        method: "POST",
        body: JSON.stringify({
          ipn: childIpn,
          name: childName,
          description: part.description,
          categoryId: part.categoryId,
          revision: childRevision || "A",
          variantOfId: childModal === "variant" ? part.id : part.variantOfId,
          revisionOfId:
            childModal === "revision" ? part.revisionOfId ?? part.id : null,
          unit: part.unit,
          minimumStock: part.minimumStock,
          assembly: part.assembly,
          component: part.component,
          trackable: part.trackable,
          purchaseable: part.purchaseable,
          salable: part.salable,
          virtual: part.virtual,
        }),
      });
      setChildModal(null);
      router.push(`/parts/${created.id}`);
    } catch (err) {
      setChildError(err instanceof Error ? err.message : "Failed to create linked part");
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !noteContent.trim()) return;
    await apiFetch<NoteView>("/api/v1/notes", {
      method: "POST",
      body: JSON.stringify({
        entityType: "Part",
        entityId: part.id,
        content: noteContent.trim(),
      }),
    });
    setNoteContent("");
    await loadAll();
  }

  async function handleDeleteNote(noteId: string) {
    await apiFetch<void>(`/api/v1/notes/${noteId}`, { method: "DELETE" });
    await loadAll();
  }

  async function handleCreatePresignedAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!part || !attachmentFileName.trim()) return;
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
    setAttachmentFileName("");
    setAttachmentComment("");
    await loadAll();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[#E4E4E7]" />
        <div className="h-40 animate-pulse rounded-[12px] bg-white" />
      </div>
    );
  }

  if (error || !part) {
    return <ErrorState message={error ?? "Part not found"} onRetry={loadAll} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/parts"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#52525B] hover:text-[#1D4ED8]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Parts Catalog</span>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="rounded-[8px] border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-1 font-mono text-[14px] font-semibold text-[#1D4ED8]">
              {part.ipn}
            </span>
            <span className="rounded border border-[#E4E4E7] bg-white px-2 py-0.5 font-mono text-[12px] text-[#52525B]">
              Rev {part.revision}
            </span>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#18181B]">
              {part.name}
            </h1>
            <StatusBadge
              label={part.active ? "Active" : "Inactive"}
              tone={part.active ? "success" : "neutral"}
            />
            {part.locked && <StatusBadge label="Locked" tone="warning" />}
          </div>

          {part.description && (
            <p className="mt-1 max-w-2xl text-[13px] text-[#52525B]">{part.description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission("PART:UPDATE") && (
            <>
              <button
                type="button"
                onClick={handleToggleLock}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
              >
                {part.locked ? (
                  <>
                    <Unlock className="h-4 w-4 text-[#166534]" />
                    <span>Unlock</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-[#92400E]" />
                    <span>Lock Revision</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={part.locked}
                onClick={() => {
                  setEditForm({
                    ipn: part.ipn,
                    name: part.name,
                    description: part.description ?? "",
                    categoryId: part.categoryId ?? "",
                    revision: part.revision,
                    unit: part.unit,
                    minimumStock: String(part.minimumStock),
                    active: part.active,
                    assembly: part.assembly,
                    component: part.component,
                    trackable: part.trackable,
                    purchaseable: part.purchaseable,
                    salable: part.salable,
                    virtual: part.virtual,
                  });
                  setEditError(null);
                  setShowEditModal(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8] disabled:opacity-50"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Part</span>
              </button>
            </>
          )}

          {hasPermission("PART:CREATE") && (
            <>
              <button
                type="button"
                onClick={() => {
                  setChildIpn(`${part.ipn}-VAR`);
                  setChildName(`${part.name} (Variant)`);
                  setChildRevision("A");
                  setChildError(null);
                  setChildModal("variant");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
              >
                <Layers className="h-4 w-4 text-[#6D28D9]" />
                <span>+ Variant</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChildIpn(part.ipn);
                  setChildName(part.name);
                  setChildRevision(part.revision === "A" ? "B" : `${part.revision}+`);
                  setChildError(null);
                  setChildModal("revision");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-3.5 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
              >
                <GitBranch className="h-4 w-4" />
                <span>+ New Revision</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="In Stock"
          value={`${Number(stockSummary?.inStock ?? 0).toLocaleString()} ${part.unit}`}
          hint={`Min: ${Number(part.minimumStock).toLocaleString()} ${part.unit}`}
          mono
        />
        <StatTile
          label="Available"
          value={`${Number(stockSummary?.availableStock ?? 0).toLocaleString()} ${part.unit}`}
          hint="Unallocated inventory"
          mono
        />
        <StatTile
          label="Allocated (Builds)"
          value={`${Number(stockSummary?.allocatedToBuilds ?? 0).toLocaleString()} ${part.unit}`}
          hint="Reserved for BOs"
          mono
        />
        <StatTile
          label="Allocated (Sales)"
          value={`${Number(stockSummary?.allocatedToSales ?? 0).toLocaleString()} ${part.unit}`}
          hint="Reserved for SOs"
          mono
        />
        <StatTile
          label="On Order"
          value={`${Number(stockSummary?.onOrder ?? 0).toLocaleString()} ${part.unit}`}
          hint="Inbound PO lines"
          mono
        />
        <StatTile
          label="In Production"
          value={`${Number(stockSummary?.inProduction ?? 0).toLocaleString()} ${part.unit}`}
          hint="Active build outputs"
          mono
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E4E4E7]">
        {[
          { id: "overview", label: "Overview", icon: Cpu },
          {
            id: "parameters",
            label: `Parameters (${part.parameters.length})`,
            icon: SlidersHorizontal,
          },
          {
            id: "suppliers",
            label: `Suppliers & MPNs (${supplierParts.length + manufacturerParts.length})`,
            icon: Building2,
          },
          {
            id: "variants",
            label: `Variants & Revisions (${variants.length + revisions.length})`,
            icon: GitBranch,
          },
          {
            id: "notes",
            label: `Notes & Attachments (${notes.length + attachments.length})`,
            icon: Paperclip,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DetailTab)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                active
                  ? "border-[#1D4ED8] text-[#1D4ED8]"
                  : "border-transparent text-[#52525B] hover:text-[#18181B]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Engineering Classification & Flags
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              {[
                { label: "Assembly (BOM Parent)", enabled: part.assembly },
                { label: "Component (BOM Child)", enabled: part.component },
                { label: "Trackable (Serialized)", enabled: part.trackable },
                { label: "Purchaseable (Inbound PO)", enabled: part.purchaseable },
                { label: "Salable (Customer SO)", enabled: part.salable },
                { label: "Virtual (Non-physical)", enabled: part.virtual },
              ].map((flag) => (
                <div
                  key={flag.label}
                  className="flex items-center justify-between rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-3 py-2"
                >
                  <span className="text-[#18181B]">{flag.label}</span>
                  <StatusBadge
                    label={flag.enabled ? "Yes" : "No"}
                    tone={flag.enabled ? "primary" : "neutral"}
                    showDot={false}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#18181B]">Key Typed Parameters</h2>
              <button
                type="button"
                onClick={() => setActiveTab("parameters")}
                className="text-[12px] font-medium text-[#1D4ED8] hover:underline"
              >
                Manage all →
              </button>
            </div>
            {part.parameters.length === 0 ? (
              <p className="mt-4 text-[13px] text-[#63636B]">
                No typed parameters assigned yet. Switch to the Parameters tab to attach physical
                specifications.
              </p>
            ) : (
              <dl className="mt-4 divide-y divide-[#E4E4E7] text-[13px]">
                {part.parameters.map((pp) => (
                  <div key={pp.id} className="flex items-center justify-between py-2">
                    <dt className="font-medium text-[#52525B]">{pp.templateName}</dt>
                    <dd className="font-mono font-medium text-[#18181B]">
                      {pp.valueText}
                      {pp.valueNumeric !== null && (
                        <span className="ml-2 text-[11px] text-[#63636B]">
                          (SI: {pp.valueNumeric.toExponential(3)})
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Typed Parameters */}
      {activeTab === "parameters" && (
        <div className="space-y-4 rounded-[12px] border border-[#E4E4E7] bg-white p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Unit-Normalized Parameters (Indriya JSR-385)
            </h2>
            <p className="text-[12px] text-[#52525B]">
              Values with physical units (e.g. <code className="font-mono">4.7 uF</code>,{" "}
              <code className="font-mono">470 nF</code>, <code className="font-mono">10 kOhm</code>)
              are validated for dimensional compatibility and stored in SI base units for B-tree
              range indexing.
            </p>
          </div>

          {paramError && (
            <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
              {paramError}
            </div>
          )}

          {hasPermission("PART:UPDATE") && !part.locked && (
            <form
              onSubmit={handleUpsertParameter}
              className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#E4E4E7] bg-[#F7F7F8] p-3"
            >
              <select
                required
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="h-9 min-w-[220px] rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
              >
                <option value="">Select parameter template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.units ? `(${t.units})` : t.checkbox ? "(Boolean)" : ""}
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder="Enter value (e.g. 4.7 uF, 10 kOhm, true)…"
                className="h-9 min-w-[240px] flex-1 rounded-[8px] border border-[#E4E4E7] bg-white px-3 font-mono text-[13px]"
              />

              <button
                type="submit"
                disabled={savingParam}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{savingParam ? "Saving…" : "Set Parameter"}</span>
              </button>
            </form>
          )}

          <div className="overflow-x-auto rounded-[8px] border border-[#E4E4E7]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="bg-[#F7F7F8] text-[12px] text-[#52525B]">
                <tr className="border-b border-[#E4E4E7]">
                  <th className="px-4 py-2.5 font-semibold">Parameter</th>
                  <th className="px-4 py-2.5 font-semibold">Formatted Value</th>
                  <th className="px-4 py-2.5 font-semibold">SI Normalized (value_numeric)</th>
                  <th className="px-4 py-2.5 font-semibold">Template Unit</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {part.parameters.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#63636B]">
                      No parameters recorded for this part yet.
                    </td>
                  </tr>
                ) : (
                  part.parameters.map((pp) => (
                    <tr key={pp.id}>
                      <td className="px-4 py-2.5 font-medium text-[#18181B]">
                        {pp.templateName}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#1D4ED8]">
                        {pp.valueText}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[#52525B]">
                        {pp.valueNumeric !== null ? pp.valueNumeric : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[#63636B]">
                        {pp.checkbox ? "Boolean" : pp.templateUnits || "Text"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {hasPermission("PART:UPDATE") && !part.locked && (
                          <button
                            type="button"
                            onClick={() => handleDeleteParameter(pp.id)}
                            className="text-[12px] text-[#991B1B] hover:underline"
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

      {/* TAB 2b: Suppliers & Manufacturers */}
      {activeTab === "suppliers" && (
        <div className="space-y-6">
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Supplier SKUs & Tiered Price Breaks ({supplierParts.length})
            </h2>
            <p className="text-[12px] text-[#52525B]">
              Vendor pack quantities convert automatically to internal units ({part.unit}) and
              tenant base currency.
            </p>
            <div className="mt-3 overflow-x-auto rounded-[8px] border border-[#E4E4E7]">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-[#F7F7F8] text-[12px] text-[#52525B]">
                  <tr className="border-b border-[#E4E4E7]">
                    <th className="px-4 py-2 font-semibold">Supplier</th>
                    <th className="px-4 py-2 font-semibold">Vendor SKU</th>
                    <th className="px-4 py-2 font-semibold">Pack Conversion</th>
                    <th className="px-4 py-2 font-semibold">Price Breaks (Original → Base)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {supplierParts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-[#63636B]">
                        No supplier SKUs linked to this part yet.
                      </td>
                    </tr>
                  ) : (
                    supplierParts.map((sp) => (
                      <tr key={sp.id}>
                        <td className="px-4 py-2.5 font-medium text-[#18181B]">
                          <Link
                            href={`/companies/${sp.supplierId}`}
                            className="text-[#1D4ED8] hover:underline"
                          >
                            {sp.supplierName}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-[#18181B]">
                          {sp.sku}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px]">
                          1 pack = {sp.packQuantity} {part.unit} (MOQ {sp.moq})
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px]">
                          {sp.priceBreaks.length === 0
                            ? "—"
                            : sp.priceBreaks.map((pb) => (
                                <div key={pb.id}>
                                  ≥{pb.minQuantity}: {pb.unitPrice} {pb.currency}/pack →{" "}
                                  <span className="font-semibold text-[#1D4ED8]">
                                    {pb.convertedInternalUnitPriceInBase} {pb.tenantBaseCurrency}/
                                    {part.unit}
                                  </span>
                                </div>
                              ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Approved Manufacturer Part Numbers ({manufacturerParts.length})
            </h2>
            <div className="mt-3 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7] text-[13px]">
              {manufacturerParts.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[#63636B]">
                  No manufacturer MPNs linked yet.
                </div>
              ) : (
                manufacturerParts.map((mp) => (
                  <div key={mp.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="font-mono font-semibold text-[#1D4ED8]">{mp.mpn}</span>
                      <span className="ml-2 text-[#52525B]">by {mp.manufacturerName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Variants & Revisions */}
      {activeTab === "variants" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Variants */}
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#18181B]">
                  Template Variants ({variants.length})
                </h2>
                <p className="text-[12px] text-[#52525B]">
                  Child parts linked via <code className="font-mono">variant_of_id</code>.
                </p>
              </div>
              {hasPermission("PART:CREATE") && (
                <button
                  type="button"
                  onClick={() => {
                    setChildIpn(`${part.ipn}-V${variants.length + 1}`);
                    setChildName(`${part.name} Variant ${variants.length + 1}`);
                    setChildRevision("A");
                    setChildError(null);
                    setChildModal("variant");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white"
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
                  description="Create variants when multiple SKUs share this template part."
                />
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7]">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-3.5 py-2.5">
                    <div>
                      <Link
                        href={`/parts/${v.id}`}
                        className="font-mono text-[13px] font-medium text-[#1D4ED8] hover:underline"
                      >
                        {v.ipn}
                      </Link>
                      <div className="text-[12px] text-[#18181B]">{v.name}</div>
                    </div>
                    <StatusBadge label={`Rev ${v.revision}`} tone="neutral" showDot={false} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revisions */}
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-[#18181B]">
                  Part Revisions ({revisions.length})
                </h2>
                <p className="text-[12px] text-[#52525B]">
                  Engineering revision history linked via{" "}
                  <code className="font-mono">revision_of_id</code>.
                </p>
              </div>
              {hasPermission("PART:CREATE") && (
                <button
                  type="button"
                  onClick={() => {
                    setChildIpn(part.ipn);
                    setChildName(part.name);
                    setChildRevision("B");
                    setChildError(null);
                    setChildModal("revision");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[12px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
                >
                  <GitBranch className="h-3.5 w-3.5 text-[#1D4ED8]" />
                  <span>New Revision</span>
                </button>
              )}
            </div>

            <div className="mt-4 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7]">
              {revisions.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3.5 py-2.5">
                  <div>
                    <Link
                      href={`/parts/${r.id}`}
                      className="font-mono text-[13px] font-medium text-[#1D4ED8] hover:underline"
                    >
                      {r.ipn} · Rev {r.revision}
                    </Link>
                    <div className="text-[12px] text-[#52525B]">{r.name}</div>
                  </div>
                  {r.id === part.id ? (
                    <StatusBadge label="Current" tone="primary" />
                  ) : (
                    <StatusBadge label={`Rev ${r.revision}`} tone="neutral" showDot={false} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Notes & Attachments */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notes */}
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Engineering Notes ({notes.length})
            </h2>
            <p className="text-[12px] text-[#52525B]">
              Indexed via PostgreSQL <code className="font-mono">pg_trgm</code> for instant{" "}
              <kbd className="rounded border px-1 font-mono text-[11px]">⌘K</kbd> search.
            </p>

            <form onSubmit={handleAddNote} className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add an engineering note, errata, or qualification comment…"
                className="w-full rounded-[8px] border border-[#E4E4E7] p-2.5 text-[13px]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-8 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white hover:bg-[#1E40AF]"
                >
                  Save Note
                </button>
              </div>
            </form>

            <div className="mt-4 space-y-2">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] p-3 text-[13px]"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#63636B]">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(n.id)}
                      className="text-[#991B1B] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-[#18181B]">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-5">
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Datasheets & Attachments ({attachments.length})
            </h2>
            <p className="text-[12px] text-[#52525B]">
              Uploaded directly to S3 object storage via presigned URLs.
            </p>

            <form
              onSubmit={handleCreatePresignedAttachment}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              <input
                type="text"
                required
                value={attachmentFileName}
                onChange={(e) => setAttachmentFileName(e.target.value)}
                placeholder="datasheet.pdf"
                className="h-9 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <input
                type="text"
                value={attachmentComment}
                onChange={(e) => setAttachmentComment(e.target.value)}
                placeholder="Comment (optional)"
                className="h-9 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <button
                type="submit"
                className="h-9 rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-3 text-[12px] font-medium text-[#18181B] hover:border-[#1D4ED8]"
              >
                + Register Datasheet
              </button>
            </form>

            <div className="mt-4 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7]">
              {attachments.length === 0 ? (
                <div className="p-6 text-center text-[12px] text-[#63636B]">
                  No attachments linked to this part yet.
                </div>
              ) : (
                attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between px-3.5 py-2.5 text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#1D4ED8]" />
                      <div>
                        <div className="font-medium text-[#18181B]">{att.fileName}</div>
                        {att.comment && (
                          <div className="text-[11px] text-[#63636B]">{att.comment}</div>
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

      {/* Modal: Create Variant / Revision */}
      {childModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">
                {childModal === "variant" ? "Create Part Variant" : "Create New Part Revision"}
              </h2>
              <button
                type="button"
                onClick={() => setChildModal(null)}
                className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChildPart} className="mt-4 space-y-3">
              {childError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {childError}
                </div>
              )}
              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">IPN *</label>
                <input
                  type="text"
                  required
                  value={childIpn}
                  onChange={(e) => setChildIpn(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">Revision *</label>
                <input
                  type="text"
                  required
                  value={childRevision}
                  onChange={(e) => setChildRevision(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">Part Name *</label>
                <input
                  type="text"
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setChildModal(null)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Part */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">Edit Part · {part.ipn}</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded p-1 text-[#63636B] hover:bg-[#F7F7F8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              {editError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {editError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">IPN *</label>
                  <input
                    type="text"
                    required
                    value={editForm.ipn}
                    onChange={(e) => setEditForm({ ...editForm, ipn: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Revision *</label>
                  <input
                    type="text"
                    required
                    value={editForm.revision}
                    onChange={(e) => setEditForm({ ...editForm, revision: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#18181B]">Category</label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.structural}>
                      {c.pathString} {c.structural ? "(Structural)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.minimumStock}
                    onChange={(e) => setEditForm({ ...editForm, minimumStock: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
