"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  ApiTokenView,
  CreatedApiTokenResponse,
} from "@ims/api-client";
import { DataTable, StatusBadge } from "@ims/ui";
import { FeatureGate } from "@/lib/entitlements";
import { KeyRound, Trash2 } from "lucide-react";

export default function ApiTokensSettingsPage() {
  const [name, setName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data: tokens, isLoading, refetch } = useQuery({
    queryKey: ["settings-api-tokens"],
    queryFn: () => apiFetch<ApiTokenView[]>("/api/v1/settings/api-tokens"),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch<CreatedApiTokenResponse>("/api/v1/settings/api-tokens", {
      method: "POST",
      body: JSON.stringify({ name, scopes: [] }),
    });
    setName("");
    setCreatedSecret(res.rawToken);
    refetch();
  }

  async function handleRevoke(id: string) {
    await apiFetch(`/api/v1/settings/api-tokens/${id}`, { method: "DELETE" });
    refetch();
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
        <code className="rounded bg-[#F4F4F5] px-2 py-0.5 font-mono text-[12px]">
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
        <span className="font-mono text-[12px] text-[#52525B]">
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
            className="inline-flex items-center gap-1 rounded-[6px] border border-[#FECACA] px-2.5 py-1 text-[12px] font-medium text-[#991B1B] hover:bg-[#FEE2E2]/50"
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
            <KeyRound className="h-4 w-4 text-[#1D4ED8]" />
            <h2 className="text-[15px] font-semibold text-[#18181B]">
              Generate API Token
            </h2>
          </div>
          <p className="mt-0.5 text-[12px] text-[#63636B]">
            API tokens authenticate directly against Spring Boot using SHA-256 hash verification and per-token rate limiting.
          </p>

          {createdSecret && (
            <div className="mt-4 rounded-[8px] border border-[#BBF7D0] bg-[#DCFCE7]/50 p-3 text-[13px] text-[#166534]">
              <div className="font-semibold">
                Copy your new API token now — it will never be shown again:
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
              className="h-9 flex-1 rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
            <button
              type="submit"
              className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
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
