"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, TenantSettingView } from "@ims/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  toastApiError,
} from "@ims/ui";
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
      <Card className="p-6">
        <form onSubmit={handleSaveOrg}>
          <h2 className="text-[15px] font-semibold text-foreground">
            Organization Profile
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Updates to organization details are recorded in your tenant&apos;s immutable Audit Log.
          </p>

          {savedBanner && (
            <Alert variant="success" className="mt-4">
              <AlertDescription>Organization profile saved.</AlertDescription>
            </Alert>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Organization Name</Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Tenant Slug (Read-only)</Label>
              <Input
                type="text"
                disabled
                value={me?.tenantSlug ?? ""}
                className="bg-background font-mono text-muted-foreground"
              />
            </div>

            <div className="space-y-1">
              <Label>Base Currency</Label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound</SelectItem>
                  <SelectItem value="SEK">SEK — Swedish Krona</SelectItem>
                  <SelectItem value="JPY">JPY — Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Default Timezone</Label>
              <Input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

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
