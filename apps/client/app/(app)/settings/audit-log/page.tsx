"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { apiFetch, AuditEventView, PageResponse } from "@ims/api-client";
import { DataTable, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusBadge, toast } from "@ims/ui";

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
    toast.info("Exporting audit log CSV…");
    window.location.href = `/api/v1/settings/audit-events/export?${params.toString()}`;
  }

  const columns: ColumnDef<AuditEventView>[] = [
    {
      accessorKey: "occurredAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-[var(--text-secondary)] tabular-nums">
          {new Date(row.original.occurredAt).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-[var(--text-primary)]">
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
          <span className="font-medium text-[var(--text-primary)]">
            {row.original.entityType}
          </span>
          {row.original.entityId && (
            <div className="font-mono text-[11px] text-[var(--text-muted)]">
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
          return <span className="text-[12px] text-[var(--text-muted)]">—</span>;
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
                    <span className="font-semibold text-[var(--text-primary)]">{field}:</span>{" "}
                    <span className="text-[var(--status-danger-fg)]">
                      {JSON.stringify(d.from)}
                    </span>{" "}
                    →{" "}
                    <span className="text-[var(--status-success-fg)]">
                      {JSON.stringify(d.to)}
                    </span>
                  </div>
                );
              }
              return (
                <div key={field} className="truncate">
                  <span className="font-semibold text-[var(--text-primary)]">{field}:</span>{" "}
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
      renderMobileCard={(ev) => {
        const a = ev.action;
        const tone =
          a === "CREATE" || a === "LOGIN"
            ? "success"
            : a === "DELETE" || a === "LOGIN_FAILED" || a === "TOKEN_REVOKED"
              ? "danger"
              : "primary";
        const entries = Object.entries(ev.changes ?? {});
        return (
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <StatusBadge label={a} tone={tone} showDot={false} />
                <span className="font-medium text-[var(--text-primary)]">{ev.entityType}</span>
              </div>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {new Date(ev.occurredAt).toLocaleString()}
              </span>
            </div>
            <div className="text-[var(--text-secondary)]">
              Actor: <strong className="text-[var(--text-primary)]">{ev.actorName ?? "SYSTEM"}</strong>
            </div>
            {entries.length > 0 && (
              <div className="space-y-0.5 rounded bg-[var(--bg-canvas)] p-2 font-mono text-[11px]">
                {entries.slice(0, 3).map(([field, val]) => {
                  const isDiff =
                    val &&
                    typeof val === "object" &&
                    ("from" in (val as any) || "to" in (val as any));
                  if (isDiff) {
                    const d = val as { from: unknown; to: unknown };
                    return (
                      <div key={field} className="break-all">
                        <span className="font-semibold">{field}:</span>{" "}
                        <span className="text-[var(--status-danger-fg)]">{JSON.stringify(d.from)}</span> →{" "}
                        <span className="text-[var(--status-success-fg)]">{JSON.stringify(d.to)}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={field} className="break-all">
                      <span className="font-semibold">{field}:</span> {JSON.stringify(val)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }}
      filterChips={
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto">
          <Select
            value={actionFilter || "__all__"}
            onValueChange={(val) => setActionFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="w-full text-base sm:w-[155px] sm:text-[12px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Actions</SelectItem>
              <SelectItem value="CREATE">CREATE</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="LOGIN">LOGIN</SelectItem>
              <SelectItem value="LOGIN_FAILED">LOGIN_FAILED</SelectItem>
              <SelectItem value="TOKEN_CREATED">TOKEN_CREATED</SelectItem>
              <SelectItem value="TOKEN_REVOKED">TOKEN_REVOKED</SelectItem>
              <SelectItem value="PERMISSION_CHANGED">PERMISSION_CHANGED</SelectItem>
              <SelectItem value="IMPORT">IMPORT</SelectItem>
              <SelectItem value="EXPORT">EXPORT</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={entityFilter || "__all__"}
            onValueChange={(val) => setEntityFilter(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="w-full text-base sm:w-[165px] sm:text-[12px]">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Entities</SelectItem>
              <SelectItem value="Tenant">Tenant</SelectItem>
              <SelectItem value="UserAccount">UserAccount</SelectItem>
              <SelectItem value="Role">Role</SelectItem>
              <SelectItem value="TenantSetting">TenantSetting</SelectItem>
              <SelectItem value="ReferenceSequence">ReferenceSequence</SelectItem>
              <SelectItem value="ApiToken">ApiToken</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
