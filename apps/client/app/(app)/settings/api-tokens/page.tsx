"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  ApiTokenView,
  CreatedApiTokenResponse,
} from "@ims/api-client";
import { DataTable, StatusBadge, toast, toastApiError } from "@ims/ui";
import { FeatureGate } from "@/lib/entitlements";
import { Copy, KeyRound, Trash2 } from "lucide-react";

export default function ApiTokensSettingsPage() {
  const [name, setName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: tokens, isLoading, refetch } = useQuery({
    queryKey: ["settings-api-tokens"],
    queryFn: () => apiFetch<ApiTokenView[]>("/api/v1/settings/api-tokens"),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch<CreatedApiTokenResponse>("/api/v1/settings/api-tokens", {
        method: "POST",
        body: JSON.stringify({ name, scopes: [] }),
      });
      const tokenName = name;
      setName("");
      setCreatedSecret(res.rawToken);
      toast.success("API token generated", { description: tokenName });
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to generate API token");
    }
  }

  async function handleRevoke(id: string) {
    try {
      await apiFetch(`/api/v1/settings/api-tokens/${id}`, { method: "DELETE" });
      toast.success("API token revoked");
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to revoke API token");
    }
  }

  const columns: ColumnDef<ApiTokenView>[] = [
    {
      accessorKey: "name",
      header: "Token Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "tokenPrefix",
      header: "Prefix",
      cell: ({ row }) => (
        <code className="rounded bg-[var(--bg-muted)] px-2 py-0.5 font-mono text-[12px]">
          {row.original.tokenPrefix}…
        </code>
      ),
    },
    {
      accessorKey: "revoked",
      header: "Status",
      cell: ({ row }) =>
        row.original.revoked ? (
          <StatusBadge label="Revoked" tone="danger" />
        ) : (
          <StatusBadge label="Active" tone="success" />
        ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-[var(--text-secondary)]">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        !row.original.revoked && (
          <button
            type="button"
            onClick={() => handleRevoke(row.original.id)}
            aria-label="Revoke API token"
            className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-danger)] px-2.5 py-1 text-[12px] font-medium text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Revoke</span>
          </button>
        ),
    },
  ];

  return (
    <FeatureGate feature="API_ACCESS" fallback="not-in-plan">
      <div className="space-y-6">
        <form
          onSubmit={handleCreate}
          className="ims-card"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--brand-primary)]" />
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Generate API Token
            </h2>
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            API tokens authenticate directly against Spring Boot using SHA-256 hash verification and per-token rate limiting.
          </p>

          {createdSecret && (
            <div className="mt-4 rounded-[8px] border border-[var(--border-success)] bg-[var(--status-success-bg)]/50 p-3 text-[13px] text-[var(--status-success-fg)]">
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span>Copy your new API token now — it will never be shown again:</span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdSecret);
                    toast.success("Token copied to clipboard");
                  }}
                  className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--border-success)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--status-success-fg)] hover:bg-[var(--status-success-bg)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <code className="mt-1 block break-all rounded bg-white p-2 font-mono text-[12px] font-bold">
                {createdSecret}
              </code>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token description (e.g. ERP Sync Worker)"
              className="h-9 flex-1 rounded-[8px] border border-[var(--border-subtle)] px-3 text-[13px]"
            />
            <button
              type="submit"
              className="h-9 rounded-[8px] bg-[var(--brand-primary)] px-4 text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
            >
              Generate Token
            </button>
          </div>
        </form>

        <DataTable
          columns={columns}
          data={tokens ?? []}
          isLoading={isLoading}
          emptyTitle="No API tokens generated"
        />
      </div>
    </FeatureGate>
  );
}
