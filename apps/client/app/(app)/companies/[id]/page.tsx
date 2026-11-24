"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AddressView,
  apiFetch,
  CompanyView,
  ContactView,
  ManufacturerPartView,
  SupplierPartView,
} from "@ims/api-client";
import { ErrorState, StatTile, StatusBadge } from "@ims/ui";
import { useEntitlements } from "@/lib/entitlements";
import { ArrowLeft, MapPin, Plus, UserCheck } from "lucide-react";

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;
  const { hasPermission } = useEntitlements();

  const [company, setCompany] = useState<CompanyView | null>(null);
  const [contacts, setContacts] = useState<ContactView[]>([]);
  const [addresses, setAddresses] = useState<AddressView[]>([]);
  const [supplierParts, setSupplierParts] = useState<SupplierPartView[]>([]);
  const [manufacturerParts, setManufacturerParts] = useState<ManufacturerPartView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState({ name: "", roleTitle: "", email: "", phone: "" });
  const [addrForm, setAddrForm] = useState({ label: "HQ", line1: "", city: "", country: "US" });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, cts, addrs, sps, mps] = await Promise.all([
        apiFetch<CompanyView>(`/api/v1/companies/${companyId}`),
        apiFetch<ContactView[]>(`/api/v1/companies/${companyId}/contacts`),
        apiFetch<AddressView[]>(`/api/v1/companies/${companyId}/addresses`),
        apiFetch<SupplierPartView[]>(`/api/v1/companies/${companyId}/supplier-parts`),
        apiFetch<ManufacturerPartView[]>(`/api/v1/companies/${companyId}/manufacturer-parts`),
      ]);
      setCompany(c);
      setContacts(cts);
      setAddresses(addrs);
      setSupplierParts(sps);
      setManufacturerParts(mps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(`/api/v1/companies/${companyId}/contacts`, {
      method: "POST",
      body: JSON.stringify({ ...contactForm, primaryContact: contacts.length === 0 }),
    });
    setContactForm({ name: "", roleTitle: "", email: "", phone: "" });
    await loadAll();
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch(`/api/v1/companies/${companyId}/addresses`, {
      method: "POST",
      body: JSON.stringify({ ...addrForm, primaryShipping: true }),
    });
    setAddrForm({ label: "Warehouse", line1: "", city: "", country: "US" });
    await loadAll();
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-[12px] bg-white" />;
  }
  if (error || !company) {
    return <ErrorState message={error ?? "Company not found"} onRetry={loadAll} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#52525B] hover:text-[#1D4ED8]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Companies</span>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[#18181B]">
            {company.name}
          </h1>
          {company.supplier && <StatusBadge label="Supplier" tone="primary" />}
          {company.manufacturer && <StatusBadge label="Manufacturer" tone="violet" />}
          {company.customer && <StatusBadge label="Customer" tone="success" />}
          <span className="rounded border border-[#E4E4E7] bg-white px-2 py-0.5 font-mono text-[12px]">
            {company.defaultCurrency}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Supplied SKUs" value={supplierParts.length} hint="Vendor pack catalog" />
        <StatTile label="Manufactured MPNs" value={manufacturerParts.length} hint="OEM part numbers" />
        <StatTile label="Contacts" value={contacts.length} hint="Account & technical contacts" />
        <StatTile label="Addresses" value={addresses.length} hint="Shipping & billing sites" />
      </div>

      {/* Contacts & Addresses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[#18181B]">Contacts ({contacts.length})</h2>
          {hasPermission("COMPANY:UPDATE") && (
            <form onSubmit={handleAddContact} className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="Contact Name"
                className="h-8 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="Email"
                className="h-8 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <input
                type="text"
                value={contactForm.roleTitle}
                onChange={(e) => setContactForm({ ...contactForm, roleTitle: e.target.value })}
                placeholder="Role / Title"
                className="h-8 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <button
                type="submit"
                className="h-8 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white"
              >
                + Add Contact
              </button>
            </form>
          )}
          <div className="mt-3 divide-y divide-[#E4E4E7] text-[13px]">
            {contacts.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-[#18181B]">{ct.name}</div>
                  <div className="text-[12px] text-[#63636B]">
                    {ct.roleTitle ?? "Contact"} · {ct.email ?? "—"}
                  </div>
                </div>
                {ct.primaryContact && <StatusBadge label="Primary" tone="primary" showDot={false} />}
              </div>
            ))}
          </div>
        </div>

        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[#18181B]">Addresses ({addresses.length})</h2>
          {hasPermission("COMPANY:UPDATE") && (
            <form onSubmit={handleAddAddress} className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={addrForm.label}
                onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                placeholder="Label (HQ / Warehouse)"
                className="h-8 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <input
                type="text"
                required
                value={addrForm.line1}
                onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                placeholder="Street Address"
                className="h-8 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <input
                type="text"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                placeholder="City"
                className="h-8 rounded-[8px] border border-[#E4E4E7] px-2.5 text-[12px]"
              />
              <button
                type="submit"
                className="h-8 rounded-[8px] bg-[#1D4ED8] px-3 text-[12px] font-medium text-white"
              >
                + Add Address
              </button>
            </form>
          )}
          <div className="mt-3 divide-y divide-[#E4E4E7] text-[13px]">
            {addresses.map((ad) => (
              <div key={ad.id} className="py-2">
                <div className="font-medium text-[#18181B]">{ad.label}</div>
                <div className="text-[12px] text-[#63636B]">
                  {ad.line1}, {ad.city} {ad.country}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supplied Parts Catalog */}
      {company.supplier && (
        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[#18181B]">
            Supplier SKUs & Converted Price Breaks ({supplierParts.length})
          </h2>
          <div className="mt-3 overflow-x-auto rounded-[8px] border border-[#E4E4E7]">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="ims-table-head">
                <tr className="border-b border-[#E4E4E7]">
                  <th className="px-4 py-2 font-semibold">Supplier SKU</th>
                  <th className="px-4 py-2 font-semibold">Internal Part</th>
                  <th className="px-4 py-2 font-semibold">Pack Quantity</th>
                  <th className="px-4 py-2 font-semibold">Tiered Price Breaks (Converted to Base)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E7]">
                {supplierParts.map((sp) => (
                  <tr key={sp.id}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-[#18181B]">{sp.sku}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/parts/${sp.partId}`}
                        className="font-mono text-[#1D4ED8] hover:underline"
                      >
                        {sp.partIpn}
                      </Link>
                      <span className="ml-2 text-[12px] text-[#52525B]">{sp.partName}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      1 pack = {sp.packQuantity} {sp.partUnit}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">
                      {sp.priceBreaks.map((pb) => (
                        <div key={pb.id}>
                          ≥{pb.minQuantity}: {pb.unitPrice} {pb.currency} (
                          <span className="text-[#1D4ED8]">
                            {pb.convertedInternalUnitPriceInBase} {pb.tenantBaseCurrency}/
                            {sp.partUnit}
                          </span>
                          )
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
