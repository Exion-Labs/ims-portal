"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { apiFetch, AuditEventView, PageResponse } from "@ims/api-client";
import { DataTable, StatusBadge } from "@ims/ui";

export default function AuditLogSettingsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["settings-audit", actionFilter, entityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entityType", entityFilter);
      return apiFetch<PageResponse<AuditEventView>>(
        `/api/v1/settings/audit-events?${params.toString()}`
      );
    },
  });

  function handleExportCsv() {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entityType", entityFilter);
    window.location.href = `/api/v1/settings/audit-events/export?${params.toString()}`;
  }

  const columns: ColumnDef<AuditEventView>[] = [
    {
      accessorKey: "occurredAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-[#52525B] tabular-nums">
          {new Date(row.original.occurredAt).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-[#18181B]">
            {row.original.actorName ?? "SYSTEM"}
          </span>
          {row.original.actorType === "PLATFORM_SUPPORT" && (
            <StatusBadge label="Support Session" tone="violet" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const a = row.original.action;
        const tone =
          a === "CREATE" || a === "LOGIN"
            ? "success"
            : a === "DELETE" || a === "LOGIN_FAILED" || a === "TOKEN_REVOKED"
              ? "danger"
              : "primary";
        return <StatusBadge label={a} tone={tone} showDot={false} />;
      },
    },
    {
      accessorKey: "entityType",
      header: "Entity",
      cell: ({ row }) => (
        <div>
          <span className="font-medium text-[#18181B]">
            {row.original.entityType}
          </span>
          {row.original.entityId && (
            <div className="font-mono text-[11px] text-[#63636B]">
              {row.original.entityId.slice(0, 8)}…
            </div>
          )}
        </div>
      ),
    },
    {
      id: "changes",
      header: "Field Diffs (Before → After)",
      cell: ({ row }) => {
        const entries = Object.entries(row.original.changes ?? {});
        if (entries.length === 0) {
          return <span className="text-[12px] text-[#63636B]">—</span>;
        }
        return (
          <div className="max-w-md space-y-1 font-mono text-[11px]">
            {entries.slice(0, 3).map(([field, val]) => {
              const isDiff =
                val &&
                typeof val === "object" &&
                ("from" in (val as any) || "to" in (val as any));
              if (isDiff) {
                const d = val as { from: unknown; to: unknown };
                return (
                  <div key={field} className="truncate">
                    <span className="font-semibold text-[#18181B]">{field}:</span>{" "}
                    <span className="text-[#991B1B]">
                      {JSON.stringify(d.from)}
                    </span>{" "}
                    →{" "}
                    <span className="text-[#166534]">
                      {JSON.stringify(d.to)}
                    </span>
                  </div>
                );
              }
              return (
                <div key={field} className="truncate">
                  <span className="font-semibold text-[#18181B]">{field}:</span>{" "}
                  <span>{JSON.stringify(val)}</span>
                </div>
              );
            })}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.content ?? []}
      isLoading={isLoading}
      emptyTitle="No audit events match your filter"
      onExportCsv={handleExportCsv}
      filterChips={
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[12px]"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="TOKEN_CREATED">TOKEN_CREATED</option>
            <option value="TOKEN_REVOKED">TOKEN_REVOKED</option>
            <option value="PERMISSION_CHANGED">PERMISSION_CHANGED</option>
            <option value="IMPORT">IMPORT</option>
            <option value="EXPORT">EXPORT</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[12px]"
          >
            <option value="">All Entities</option>
            <option value="Tenant">Tenant</option>
            <option value="UserAccount">UserAccount</option>
            <option value="Role">Role</option>
            <option value="TenantSetting">TenantSetting</option>
            <option value="ReferenceSequence">ReferenceSequence</option>
            <option value="ApiToken">ApiToken</option>
          </select>
        </div>
      }
    />
  );
}
