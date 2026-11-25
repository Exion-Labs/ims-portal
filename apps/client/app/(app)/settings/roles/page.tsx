"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, RoleView } from "@ims/api-client";
import { StatusBadge } from "@ims/ui";
import { Plus, Trash2 } from "lucide-react";

export default function RolesSettingsPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set(["PART:VIEW", "STOCK:VIEW"]));
  const [error, setError] = useState<string | null>(null);

  const { data: roles, refetch } = useQuery({
    queryKey: ["settings-roles"],
    queryFn: () => apiFetch<RoleView[]>("/api/v1/settings/roles"),
  });

  const { data: availablePerms } = useQuery({
    queryKey: ["settings-permissions"],
    queryFn: () => apiFetch<string[]>("/api/v1/settings/permissions"),
  });

  function togglePerm(code: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/api/v1/settings/roles", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          permissions: Array.from(selectedPerms),
        }),
      });
      setName("");
      setDescription("");
      refetch();
    } catch (err: any) {
      setError(err.message ?? "Failed to create role");
    }
  }

  async function handleDeleteRole(id: string) {
    await apiFetch(`/api/v1/settings/roles/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreateRole}
        className="ims-card"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-[var(--brand-primary)]" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Create Custom Role
          </h2>
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
          Only permissions for features enabled on your tenant plan are offered below.
        </p>

        {error && (
          <div className="mt-3 rounded-[8px] border border-[var(--border-danger)] bg-[var(--status-danger-bg)]/60 px-3 py-2 text-[13px] text-[var(--status-danger-fg)]">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role Name (e.g. Quality Inspector)"
            className="h-9 rounded-[8px] border border-[var(--border-subtle)] px-3 text-[13px]"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="h-9 rounded-[8px] border border-[var(--border-subtle)] px-3 text-[13px]"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(availablePerms ?? []).map((perm) => {
            const active = selectedPerms.has(perm);
            return (
              <button
                key={perm}
                type="button"
                onClick={() => togglePerm(perm)}
                className={`rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]"
                }`}
              >
                {perm}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="h-9 rounded-[8px] bg-[var(--brand-primary)] px-4 text-[13px] font-medium text-white hover:bg-[var(--brand-primary-hover)]"
          >
            Save Role
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {(roles ?? []).map((role) => (
          <div
            key={role.id}
            className="ims-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {role.name}
                </span>
                {role.systemRole && (
                  <StatusBadge label="System" tone="neutral" showDot={false} />
                )}
              </div>
              {!role.systemRole && (
                <button
                  type="button"
                  onClick={() => handleDeleteRole(role.id)}
                  aria-label={`Delete role ${role.name}`}
                  className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--status-danger-bg)]/50 hover:text-[var(--status-danger-fg)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {role.description && (
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{role.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <span
                  key={p}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
