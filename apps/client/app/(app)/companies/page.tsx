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
  DataTable,
  EmptyState,
  ErrorState,
  ImportWizard,
  StatTile,
  StatusBadge,
} from "@ims/ui";
import { FeatureGate, useEntitlements } from "@/lib/entitlements";
import {
  Building2,
  Coins,
  FileSpreadsheet,
  Globe,
  Plus,
  Search,
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
      await loadCompanies();
    } catch (err) {
      setRateError(err instanceof Error ? err.message : "Failed to update exchange rate");
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
                className="text-[13px] font-semibold text-[#1D4ED8] hover:underline"
              >
                {row.original.name}
              </Link>
              {row.original.code && (
                <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 font-mono text-[11px] text-[#52525B]">
                  {row.original.code}
                </span>
              )}
            </div>
            {row.original.description && (
              <div className="mt-0.5 max-w-md truncate text-[12px] text-[#63636B]">
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
          <span className="rounded border border-[#E4E4E7] bg-[#F7F7F8] px-2 py-0.5 font-mono text-[12px] font-medium text-[#18181B]">
            {row.original.defaultCurrency}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Contact / Website",
        cell: ({ row }) => (
          <div className="text-[12px] text-[#52525B]">
            {row.original.email ?? row.original.website ?? "—"}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
            Companies, Suppliers & Multi-Currency Catalog
          </h1>
          <p className="mt-0.5 text-[14px] text-[#52525B]">
            Manage vendors, manufacturers, customers, pack-size SKU conversions, and foreign
            currency price breaks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRatesModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
          >
            <Coins className="h-4 w-4 text-[#1D4ED8]" />
            <span>Exchange Rates ({rates.length})</span>
          </button>

          <FeatureGate feature="IMPORT_EXPORT">
            <button
              type="button"
              onClick={() => setShowImporter((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[13px] font-medium text-[#18181B] hover:bg-[#F7F7F8]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#1D4ED8]" />
              <span>{showImporter ? "Hide Importer" : "Import Supplier SKUs"}</span>
            </button>
          </FeatureGate>

          {hasPermission("COMPANY:CREATE") && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-3.5 text-[13px] font-medium text-white hover:bg-[#1E40AF]"
            >
              <Plus className="h-4 w-4" />
              <span>New Company</span>
            </button>
          )}
        </div>
      </div>

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
      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#E4E4E7] bg-white p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#63636B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIndex(0);
            }}
            placeholder="Search company name or code…"
            className="h-9 w-full rounded-[8px] border border-[#E4E4E7] bg-[#F7F7F8] pr-3 pl-9 text-[13px] focus:border-[#1D4ED8] focus:bg-white focus:outline-hidden"
          />
        </div>

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
                    ? "border-[#1D4ED8] bg-[#EEF2FF] text-[#1D4ED8]"
                    : "border-[#E4E4E7] bg-white text-[#52525B]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

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
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
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

      {/* Modal: Create Company */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <h2 className="text-[16px] font-semibold text-[#18181B]">New Company</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-3">
              {formError && (
                <div className="rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 px-3 py-2 text-[12px] text-[#991B1B]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Mouser Electronics"
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">
                    Currency
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={companyForm.defaultCurrency}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        defaultCurrency: e.target.value.toUpperCase(),
                      })
                    }
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Email</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#18181B]">Website</label>
                  <input
                    type="text"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="mt-1 h-9 w-full rounded-[8px] border border-[#E4E4E7] px-3 text-[13px]"
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
                    className="flex items-center gap-2 rounded-[8px] border border-[#E4E4E7] px-3 py-2 text-[12px]"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(companyForm[r.key as keyof typeof companyForm])}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, [r.key]: e.target.checked })
                      }
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 rounded-[8px] border border-[#E4E4E7] px-4 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[13px] font-medium text-white"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exchange Rates */}
      {showRatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[12px] border border-[#E4E4E7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#18181B]">
                  Exchange Rates (1 USD = X Target)
                </h2>
                <p className="text-[12px] text-[#52525B]">
                  Tenant base currency:{" "}
                  <strong className="font-mono">{me?.baseCurrency ?? "USD"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRatesModal(false)}
                className="rounded p-1 text-[#63636B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {rateError && (
              <div className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEE2E2]/60 p-2.5 text-[12px] text-[#991B1B]">
                {rateError}
              </div>
            )}

            <FeatureGate feature="MULTI_CURRENCY">
              <form onSubmit={handleSaveRate} className="mt-3 flex gap-2">
                <input
                  type="text"
                  maxLength={3}
                  required
                  value={rateCurrency}
                  onChange={(e) => setRateCurrency(e.target.value.toUpperCase())}
                  placeholder="EUR"
                  className="h-9 w-24 rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                />
                <input
                  type="number"
                  step="any"
                  required
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  placeholder="0.92"
                  className="h-9 flex-1 rounded-[8px] border border-[#E4E4E7] px-3 font-mono text-[13px]"
                />
                <button
                  type="submit"
                  className="h-9 rounded-[8px] bg-[#1D4ED8] px-4 text-[12px] font-medium text-white"
                >
                  Update Rate
                </button>
              </form>
            </FeatureGate>

            <div className="mt-4 max-h-64 overflow-y-auto rounded-[8px] border border-[#E4E4E7]">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-[#F7F7F8] text-[#52525B]">
                  <tr className="border-b border-[#E4E4E7]">
                    <th className="px-3 py-2 font-semibold">Pair</th>
                    <th className="px-3 py-2 text-right font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {rates.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-mono font-medium text-[#18181B]">
                        1 {r.baseCurrency} → {r.targetCurrency}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[#1D4ED8]">
                        {Number(r.rate).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
