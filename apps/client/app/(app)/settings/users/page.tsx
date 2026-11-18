"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  RoleView,
  UserWithRolesView,
} from "@ims/api-client";
import { DataTable, StatusBadge } from "@ims/ui";
import { UserPlus } from "lucide-react";

export default function UsersSettingsPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["settings-users"],
    queryFn: () => apiFetch<UserWithRolesView[]>("/api/v1/settings/users"),
  });

  const { data: roles } = useQuery({
    queryKey: ["settings-roles"],
    queryFn: () => apiFetch<RoleView[]>("/api/v1/settings/roles"),
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastInviteToken(null);
    try {
      const res = await apiFetch<{ user: UserWithRolesView; inviteToken: string }>(
        "/api/v1/settings/users/invite",
        {
          method: "POST",
          body: JSON.stringify({
            email: inviteEmail,
            fullName: inviteName,
            roleIds: selectedRoleId ? [selectedRoleId] : [],
          }),
        }
      );
      setInviteEmail("");
      setInviteName("");
      setLastInviteToken(res.inviteToken);
      refetch();
    } catch (err: any) {
      setError(err.message ?? "Failed to invite user");
    }
  }

  const columns: ColumnDef<UserWithRolesView>[] = [
    {
      accessorKey: "fullName",
      header: "User",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-[#18181B]">{row.original.fullName}</div>
          <div className="text-[12px] text-[#63636B]">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <StatusBadge
            label={s}
            tone={s === "ACTIVE" ? "success" : s === "INVITED" ? "warning" : "danger"}
          />
        );
      },
    },
    {
      id: "roles",
      header: "Assigned Roles",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.roles.map((r) => (
            <StatusBadge key={r.id} label={r.name} tone="primary" showDot={false} />
          ))}
        </div>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Sign-In",
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-[#52525B]">
          {row.original.lastLoginAt
            ? new Date(row.original.lastLoginAt).toLocaleString()
            : "Never"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <form
        onSubmit={handleInvite}
        className="rounded-[12px] border border-[#E4E4E7] bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#1D4ED8]" />
          <h2 className="text-[15px] font-semibold text-[#18181B]">
            Invite Team Member
          </h2>
        </div>

        {error && (
          <div className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[13px] text-[#991B1B]">
            {error}
          </div>
        )}

        {lastInviteToken && (
          <div className="mt-3 rounded-[8px] border border-[#BBF7D0] bg-[#DCFCE7]/50 p-3 text-[13px] text-[#166534]">
            Invitation created! Dev acceptance token:{" "}
            <code className="rounded bg-white px-2 py-0.5 font-mono font-semibold">
              {lastInviteToken}
            </code>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            required
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Full Name"
            className="h-9 rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
          />
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="h-9 rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
          />
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="h-9 rounded-[8px] border border-[#E4E4E7] bg-white px-2.5 text-[13px]"
          >
            <option value="">Select Role…</option>
            {(roles ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
          >
            Send Invite
          </button>
        </div>
      </form>

      <DataTable
        columns={columns}
        data={users ?? []}
        isLoading={isLoading}
        emptyTitle="No users found"
      />
    </div>
  );
}
