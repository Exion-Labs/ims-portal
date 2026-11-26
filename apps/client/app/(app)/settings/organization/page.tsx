"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, TenantSettingView } from "@ims/api-client";
import { toast, toastApiError } from "@ims/ui";
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
      toast.success("Organization profile saved");
    } catch (err) {
      toastApiError(err, "Failed to save organization");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveOrg}
        className="ims-card p-6"
      >
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
          Organization Profile
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
          Updates to organization details are recorded in your tenant&apos;s immutable Audit Log.
        </p>

        {savedBanner && (
          <div className="mt-4 rounded-[8px] border border-[var(--border-success)] bg-[var(--status-success-bg)]/50 px-3 py-2 text-[13px] text-[var(--status-success-fg)]">
            Organization profile saved.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="ims-label">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ims-input mt-1"
            />
          </div>

          <div>
            <label className="ims-label">
              Tenant Slug (Read-only)
            </label>
            <input
              type="text"
              disabled
              value={me?.tenantSlug ?? ""}
              className="mt-1 h-9 w-full rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 font-mono text-[13px] text-[var(--text-muted)]"
            />
          </div>

          <div>
            <label className="ims-label">
              Base Currency
            </label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="ims-select mt-1"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="SEK">SEK — Swedish Krona</option>
              <option value="JPY">JPY — Japanese Yen</option>
            </select>
          </div>

          <div>
            <label className="ims-label">
              Default Timezone
            </label>
            <input
              type="text"
              required
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="ims-input mt-1 font-mono"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="ims-btn-primary"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Typed Key-Value Store Viewer */}
      <div className="ims-card p-6">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
          Typed Tenant Preferences (`TenantSetting`)
        </h3>
        <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
          Key-value preferences scoped to this tenant and audited automatically by Hibernate.
        </p>

        <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
          {(kvSettings ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 text-[13px]"
            >
              <div>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {item.settingKey}
                </span>
                <span className="ml-2 rounded bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                  {item.valueType}
                </span>
              </div>
              <span className="font-mono text-[var(--text-secondary)]">{item.settingValue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
