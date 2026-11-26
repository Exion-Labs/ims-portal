"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import {
  apiFetch,
  CompanyView,
  ExchangeRateView,
  PageResponse,
} from "@ims/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  ImportWizard,
  Input,
  Label,
  StatTile,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  toastApiError,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import { ListToolbar, ListToolbarMenuItem } from "@/components/list-toolbar";
import {
  Building2,
  Coins,
  FileSpreadsheet,
  Globe,
  Plus,
  X,
} from "lucide-react";

export default function CompaniesPage() {
  const { me, hasPermission, hasFeature } = useEntitlements();

  const [companiesPage, setCompaniesPage] = useState<PageResponse<CompanyView> | null>(null);
  const [rates, setRates] = useState<ExchangeRateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState<boolean | null>(null);
  const [filterManufacturer, setFilterManufacturer] = useState<boolean | null>(null);
  const [filterCustomer, setFilterCustomer] = useState<boolean | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  const [showImporter, setShowImporter] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRatesModal, setShowRatesModal] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    name: "",
    code: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    taxId: "",
    defaultCurrency: me?.baseCurrency ?? "USD",
    supplier: true,
    manufacturer: false,
    customer: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [rateCurrency, setRateCurrency] = useState("EUR");
  const [rateValue, setRateValue] = useState("0.92");
  const [rateError, setRateError] = useState<string | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageIndex));
      params.set("size", "25");
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterSupplier !== null) params.set("supplier", String(filterSupplier));
      if (filterManufacturer !== null) params.set("manufacturer", String(filterManufacturer));
      if (filterCustomer !== null) params.set("customer", String(filterCustomer));

      const [res, ratesRes] = await Promise.all([
        apiFetch<PageResponse<CompanyView>>(`/api/v1/companies?${params.toString()}`),
        apiFetch<ExchangeRateView[]>("/api/v1/currencies/rates"),
      ]);
      setCompaniesPage(res);
      setRates(ratesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [pageIndex, searchQuery, filterSupplier, filterManufacturer, filterCustomer]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await apiFetch<CompanyView>("/api/v1/companies", {
        method: "POST",
        body: JSON.stringify(companyForm),
      });
      setShowCreateModal(false);
      toast.success("Company created", { description: companyForm.name });
      setCompanyForm({
        name: "",
        code: "",
        description: "",
        website: "",
        email: "",
        phone: "",
        taxId: "",
        defaultCurrency: me?.baseCurrency ?? "USD",
        supplier: true,
        manufacturer: false,
        customer: false,
      });
      await loadCompanies();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create company");
      toastApiError(err, "Failed to create company");
    }
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    setRateError(null);
    try {
      await apiFetch("/api/v1/currencies/rates", {
        method: "POST",
        body: JSON.stringify({
          targetCurrency: rateCurrency,
          rate: Number(rateValue),
        }),
      });
      toast.success("Exchange rate updated", {
        description: `1 USD = ${rateValue} ${rateCurrency}`,
      });
      await loadCompanies();
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "Failed to update exchange rate");
      toastApiError(err, "Failed to update exchange rate");
    }
  }

  const columns = useMemo<ColumnDef<CompanyView, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Company Name",
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/companies/${row.original.id}`}
                className="text-[13px] font-semibold text-[var(--brand-primary)] hover:underline"
              >
                {row.original.name}
              </Link>
              {row.original.code && (
                <span className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                  {row.original.code}
                </span>
              )}
            </div>
            {row.original.description && (
              <div className="mt-0.5 max-w-md truncate text-[12px] text-[var(--text-muted)]">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "roles",
        header: "Partner Roles",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              {c.supplier && <StatusBadge label="Supplier" tone="primary" showDot={false} />}
              {c.manufacturer && (
                <StatusBadge label="Manufacturer" tone="violet" showDot={false} />
              )}
              {c.customer && <StatusBadge label="Customer" tone="success" showDot={false} />}
              {c.internalCompany && (
                <StatusBadge label="Internal" tone="neutral" showDot={false} />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "defaultCurrency",
        header: "Default Currency",
        cell: ({ row }) => (
          <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 font-mono text-[12px] font-medium text-[var(--text-primary)]">
            {row.original.defaultCurrency}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Contact / Website",
        cell: ({ row }) => (
          <div className="text-[12px] text-[var(--text-secondary)]">
            {row.original.email ?? row.original.website ?? "—"}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Companies"
          value={companiesPage?.totalElements ?? 0}
          hint="Suppliers, manufacturers & customers"
        />
        <StatTile
          label="Tenant Base Currency"
          value={me?.baseCurrency ?? "USD"}
          hint="All price breaks convert at read/rollup time"
          mono
        />
        <StatTile
          label="Active Exchange Rates"
          value={rates.length}
          hint="USD pivot rate table"
        />
        <StatTile
          label="Multi-Currency Entitlement"
          value={hasFeature("MULTI_CURRENCY") ? "Enabled" : "Base Only"}
          hint="Controls foreign currency POs & price breaks"
        />
      </div>

      {showImporter && (
        <ImportWizard
          targetType="SUPPLIER_PART"
          targetFields={[
            { key: "ipn", label: "Internal Part IPN", required: true },
            { key: "supplierName", label: "Supplier Company Name", required: true },
            { key: "sku", label: "Supplier SKU", required: true },
            { key: "packQuantity", label: "Pack Quantity", required: false },
            { key: "unitPrice", label: "Pack Price", required: false },
            { key: "currency", label: "Currency (USD, EUR, JPY)", required: false },
          ]}
        />
      )}

      {/* Filter Bar */}
      <ListToolbar
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPageIndex(0);
        }}
        searchPlaceholder="Search company name or code…"
        filters={
          <div className="flex items-center gap-1.5">
            {[
              { label: "Suppliers", val: filterSupplier, set: setFilterSupplier },
              { label: "Manufacturers", val: filterManufacturer, set: setFilterManufacturer },
              { label: "Customers", val: filterCustomer, set: setFilterCustomer },
            ].map((chip) => {
              const active = chip.val === true;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    chip.set(active ? null : true);
                    setPageIndex(0);
                  }}
                  className={`h-8 rounded-full border px-3 text-[12px] font-medium ${
                    active
                      ? "border-[var(--brand-primary)] bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                      : "border-[var(--border-subtle)] bg-white text-[var(--text-secondary)]"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        }
        menuItems={(() => {
          const items: ListToolbarMenuItem[] = [];
          if (hasFeature("IMPORT_EXPORT")) {
            items.push({
              key: "import",
              label: showImporter ? "Hide Importer" : "Import Supplier SKUs",
              icon: <FileSpreadsheet className="h-4 w-4 text-[var(--brand-primary)]" />,
              onClick: () => setShowImporter((v) => !v),
            });
          }
          items.push({
            key: "rates",
            label: `Exchange Rates (${rates.length})`,
            icon: <Coins className="h-4 w-4 text-[var(--brand-primary)]" />,
            onClick: () => setShowRatesModal(true),
          });
          return items;
        })()}
        primaryAction={
          hasPermission("COMPANY:CREATE")
            ? {
                label: "New Company",
                onClick: () => setShowCreateModal(true),
              }
            : undefined
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={loadCompanies} />
      ) : !loading && (companiesPage?.content.length ?? 0) === 0 ? (
        <EmptyState
          title="No companies registered yet"
          description="Add suppliers, component manufacturers, and customers to build your sourcing and sales directory."
          action={
            hasPermission("COMPANY:CREATE") && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)] px-4 text-[13px] font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                <span>Create Company</span>
              </button>
            )
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={companiesPage?.content ?? []}
          isLoading={loading}
          pageIndex={pageIndex}
          pageSize={25}
          totalCount={companiesPage?.totalElements}
          onPageChange={setPageIndex}
        />
      )}

      {/* Dialog: Create Company */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Company</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCompany} className="space-y-3">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Company Name *</Label>
                <Input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="Mouser Electronics"
                />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input
                  type="text"
                  maxLength={3}
                  value={companyForm.defaultCurrency}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      defaultCurrency: e.target.value.toUpperCase(),
                    })
                  }
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input
                  type="text"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { key: "supplier", label: "Supplier" },
                { key: "manufacturer", label: "Manufacturer" },
                { key: "customer", label: "Customer" },
              ].map((r) => (
                <label
                  key={r.key}
                  className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]"
                >
                  <Checkbox
                    checked={Boolean(companyForm[r.key as keyof typeof companyForm])}
                    onCheckedChange={(v) =>
                      setCompanyForm({ ...companyForm, [r.key]: Boolean(v) })
                    }
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Company</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Exchange Rates */}
      <Dialog open={showRatesModal} onOpenChange={setShowRatesModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Exchange Rates (1 USD = X Target)</DialogTitle>
            <DialogDescription>
              Tenant base currency:{" "}
              <strong className="font-mono">{me?.baseCurrency ?? "USD"}</strong>
            </DialogDescription>
          </DialogHeader>

          {rateError && (
            <Alert variant="destructive">
              <AlertDescription>{rateError}</AlertDescription>
            </Alert>
          )}

          <FeatureGate feature="MULTI_CURRENCY">
            <form onSubmit={handleSaveRate} className="flex gap-2">
              <Input
                type="text"
                maxLength={3}
                required
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
                className="w-24 font-mono"
              />
              <Input
                type="number"
                step="any"
                required
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                placeholder="0.92"
                className="flex-1 font-mono"
              />
              <Button type="submit" size="sm">
                Update Rate
              </Button>
            </form>
          </FeatureGate>

          <div className="max-h-64 overflow-y-auto rounded-[8px] border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">
                      1 {r.baseCurrency} → {r.targetCurrency}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary">
                      {Number(r.rate).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
