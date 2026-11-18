"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, TenantSettingView } from "@ims/api-client";
import { useEntitlements } from "@/lib/entitlements";
import { useQuery } from "@tanstack/react-query";

export default function OrganizationSettingsPage() {
  const { me, refetch } = useEntitlements();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const { data: kvSettings, refetch: refetchKv } = useQuery({
    queryKey: ["settings-kv"],
    queryFn: () => apiFetch<TenantSettingView[]>("/api/v1/settings/kv"),
  });

  useEffect(() => {
    if (me) {
      setName(me.tenantName);
      setBaseCurrency(me.baseCurrency);
      setTimezone(me.timezone);
    }
  }, [me]);

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await apiFetch("/api/v1/settings/organization", {
        method: "PATCH",
        body: JSON.stringify({ name, baseCurrency, timezone }),
      });
      refetch();
      refetchKv();
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveOrg}
        className="rounded-[12px] border border-[#E4E4E7] bg-white p-6"
      >
        <h2 className="text-[15px] font-semibold text-[#18181B]">
          Organization Profile
        </h2>
        <p className="mt-0.5 text-[13px] text-[#52525B]">
          Updates to organization details are recorded in your tenant&apos;s immutable Audit Log.
        </p>

        {savedBanner && (
          <div className="mt-4 rounded-[8px] border border-[#BBF7D0] bg-[#DCFCE7]/50 px-3 py-2 text-[13px] text-[#166534]">
            Organization profile saved.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Tenant Slug (Read-only)
            </label>
            <input
              type="text"
              disabled
              value={me?.tenantSlug ?? ""}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] px-3 font-mono text-[13px] text-[#63636B]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Base Currency
            </label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px]"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="SEK">SEK — Swedish Krona</option>
              <option value="JPY">JPY — Japanese Yen</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#18181B]">
              Default Timezone
            </label>
            <input
              type="text"
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white hover:bg-[#1E40AF] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Typed Key-Value Store Viewer */}
      <div className="rounded-[12px] border border-[#E4E4E7] bg-white p-6">
        <h3 className="text-[15px] font-semibold text-[#18181B]">
          Typed Tenant Preferences (`TenantSetting`)
        </h3>
        <p className="mt-0.5 text-[13px] text-[#52525B]">
          Key-value preferences scoped to this tenant and audited automatically by Hibernate.
        </p>

        <div className="mt-4 divide-y divide-[#E4E4E7] rounded-[8px] border border-[#E4E4E7]">
          {(kvSettings ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 text-[13px]"
            >
              <div>
                <span className="font-mono font-medium text-[#18181B]">
                  {item.settingKey}
                </span>
                <span className="ml-2 rounded bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[11px] text-[#63636B]">
                  {item.valueType}
                </span>
              </div>
              <span className="font-mono text-[#52525B]">{item.settingValue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
