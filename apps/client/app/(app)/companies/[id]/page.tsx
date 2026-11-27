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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  Skeleton,
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
import { useEntitlements } from "@/lib/entitlements";
import { ArrowLeft, MapPin, Pencil, Plus, Trash2, UserCheck } from "lucide-react";

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

  const [editingContact, setEditingContact] = useState<ContactView | null>(null);
  const [editContactForm, setEditContactForm] = useState({
    name: "",
    roleTitle: "",
    email: "",
    phone: "",
    primaryContact: false,
  });

  const [editingAddress, setEditingAddress] = useState<AddressView | null>(null);
  const [editAddrForm, setEditAddrForm] = useState({
    label: "",
    line1: "",
    line2: "",
    city: "",
    stateRegion: "",
    postalCode: "",
    country: "US",
    primaryShipping: false,
    primaryBilling: false,
  });

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "contact" | "address";
    id: string;
    label: string;
  } | null>(null);

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
    try {
      await apiFetch(`/api/v1/companies/${companyId}/contacts`, {
        method: "POST",
        body: JSON.stringify({ ...contactForm, primaryContact: contacts.length === 0 }),
      });
      toast.success("Contact added", { description: contactForm.name });
      setContactForm({ name: "", roleTitle: "", email: "", phone: "" });
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to add contact");
    }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/v1/companies/${companyId}/addresses`, {
        method: "POST",
        body: JSON.stringify({ ...addrForm, primaryShipping: true }),
      });
      toast.success("Address added", { description: addrForm.label });
      setAddrForm({ label: "Warehouse", line1: "", city: "", country: "US" });
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to add address");
    }
  }

  function openEditContact(ct: ContactView) {
    setEditingContact(ct);
    setEditContactForm({
      name: ct.name,
      roleTitle: ct.roleTitle ?? "",
      email: ct.email ?? "",
      phone: ct.phone ?? "",
      primaryContact: ct.primaryContact,
    });
  }

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContact) return;
    try {
      await apiFetch(`/api/v1/companies/${companyId}/contacts/${editingContact.id}`, {
        method: "PUT",
        body: JSON.stringify(editContactForm),
      });
      toast.success("Contact updated", { description: editContactForm.name });
      setEditingContact(null);
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to update contact");
    }
  }

  function openEditAddress(ad: AddressView) {
    setEditingAddress(ad);
    setEditAddrForm({
      label: ad.label,
      line1: ad.line1,
      line2: ad.line2 ?? "",
      city: ad.city ?? "",
      stateRegion: ad.stateRegion ?? "",
      postalCode: ad.postalCode ?? "",
      country: ad.country,
      primaryShipping: ad.primaryShipping,
      primaryBilling: ad.primaryBilling,
    });
  }

  async function handleUpdateAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAddress) return;
    try {
      await apiFetch(`/api/v1/companies/${companyId}/addresses/${editingAddress.id}`, {
        method: "PUT",
        body: JSON.stringify(editAddrForm),
      });
      toast.success("Address updated", { description: editAddrForm.label });
      setEditingAddress(null);
      await loadAll();
    } catch (err) {
      toastApiError(err, "Failed to update address");
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const segment = deleteTarget.type === "contact" ? "contacts" : "addresses";
    try {
      await apiFetch(`/api/v1/companies/${companyId}/${segment}/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success(
        deleteTarget.type === "contact" ? "Contact deleted" : "Address deleted",
        { description: deleteTarget.label }
      );
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      toastApiError(
        err,
        deleteTarget.type === "contact" ? "Failed to delete contact" : "Failed to delete address"
      );
    }
  }

  if (loading) {
    return <Skeleton className="h-40 rounded-[12px]" />;
  }
  if (error || !company) {
    return <ErrorState message={error ?? "Company not found"} onRetry={loadAll} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Companies</span>
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
            {company.name}
          </h1>
          {company.supplier && <StatusBadge label="Supplier" tone="primary" />}
          {company.manufacturer && <StatusBadge label="Manufacturer" tone="violet" />}
          {company.customer && <StatusBadge label="Customer" tone="success" />}
          <span className="rounded border border-[var(--border-subtle)] bg-white px-2 py-0.5 font-mono text-[12px]">
            {company.defaultCurrency}
          </span>
        </div>
      </div>

      {/* Contacts & Addresses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Contacts ({contacts.length})</h2>
          {hasPermission("COMPANY:UPDATE") && (
            <form onSubmit={handleAddContact} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                required
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="Contact Name"
                className="h-10 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-base sm:h-8 sm:text-[12px]"
              />
              <input
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="Phone"
                className="h-10 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-base sm:h-8 sm:text-[12px]"
              />
              <input
                type="text"
                value={contactForm.roleTitle}
                onChange={(e) => setContactForm({ ...contactForm, roleTitle: e.target.value })}
                placeholder="Role / Title"
                className="h-10 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-base sm:h-8 sm:text-[12px]"
              />
              <button
                type="submit"
                className="h-10 rounded-[8px] bg-[var(--brand-primary)] px-3 text-[13px] font-medium text-white sm:h-8 sm:text-[12px]"
              >
                + Add Contact
              </button>
            </form>
          )}
          <div className="mt-3 divide-y divide-[var(--border-subtle)] text-[13px]">
            {contacts.map((ct) => (
              <div key={ct.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-[var(--text-primary)]">{ct.name}</span>
                    {ct.primaryContact && <StatusBadge label="Primary" tone="primary" showDot={false} />}
                  </div>
                  <div className="truncate text-[12px] text-[var(--text-muted)]">
                    {ct.roleTitle || "Contact"} · {ct.email || "—"}
                    {ct.phone ? ` · ${ct.phone}` : ""}
                  </div>
                </div>
                {hasPermission("COMPANY:UPDATE") && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${ct.name}`}
                      onClick={() => openEditContact(ct)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${ct.name}`}
                      onClick={() =>
                        setDeleteTarget({ type: "contact", id: ct.id, label: ct.name })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Addresses ({addresses.length})</h2>
          {hasPermission("COMPANY:UPDATE") && (
            <form onSubmit={handleAddAddress} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                required
                value={addrForm.label}
                onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                placeholder="Label (HQ / Warehouse)"
                className="h-10 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-base sm:h-8 sm:text-[12px]"
              />
              <input
                type="text"
                required
                value={addrForm.line1}
                onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                placeholder="Street Address"
                className="h-10 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-base sm:h-8 sm:text-[12px]"
              />
              <input
                type="text"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                placeholder="City"
                className="h-10 rounded-[8px] border border-[var(--border-subtle)] px-2.5 text-base sm:h-8 sm:text-[12px]"
              />
              <button
                type="submit"
                className="h-10 rounded-[8px] bg-[var(--brand-primary)] px-3 text-[13px] font-medium text-white sm:h-8 sm:text-[12px]"
              >
                + Add Address
              </button>
            </form>
          )}
          <div className="mt-3 divide-y divide-[var(--border-subtle)] text-[13px]">
            {addresses.map((ad) => (
              <div key={ad.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-[var(--text-primary)]">{ad.label}</span>
                    {ad.primaryShipping && (
                      <StatusBadge label="Shipping" tone="primary" showDot={false} />
                    )}
                    {ad.primaryBilling && (
                      <StatusBadge label="Billing" tone="neutral" showDot={false} />
                    )}
                  </div>
                  <div className="truncate text-[12px] text-[var(--text-muted)]">
                    {[ad.line1, ad.line2, ad.city, ad.stateRegion, ad.postalCode, ad.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
                {hasPermission("COMPANY:UPDATE") && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${ad.label}`}
                      onClick={() => openEditAddress(ad)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${ad.label}`}
                      onClick={() =>
                        setDeleteTarget({ type: "address", id: ad.id, label: ad.label })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supplied Parts Catalog */}
      {company.supplier && (
        <div className="ims-card">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Supplier SKUs & Converted Price Breaks ({supplierParts.length})
          </h2>
          {/* Mobile Supplier SKUs Cards */}
          <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)] md:hidden">
            {supplierParts.map((sp) => (
              <div key={sp.id} className="space-y-1.5 p-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{sp.sku}</span>
                  <span className="font-mono text-[12px] text-[var(--text-secondary)]">
                    1 pack = {sp.packQuantity} {sp.partUnit}
                  </span>
                </div>
                <div>
                  <Link
                    href={`/parts/${sp.partId}`}
                    className="font-mono text-[var(--brand-primary)] hover:underline"
                  >
                    {sp.partIpn}
                  </Link>
                  <span className="ml-2 text-[12px] text-[var(--text-secondary)]">{sp.partName}</span>
                </div>
                {sp.priceBreaks.length > 0 && (
                  <div className="space-y-0.5 pt-1 font-mono text-[12px]">
                    {sp.priceBreaks.map((pb) => (
                      <div key={pb.id}>
                        ≥{pb.minQuantity}: {pb.unitPrice} {pb.currency} (
                        <span className="text-[var(--brand-primary)]">
                          {pb.convertedInternalUnitPriceInBase} {pb.tenantBaseCurrency}/{sp.partUnit}
                        </span>
                        )
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 hidden overflow-x-auto rounded-[8px] border border-[var(--border-subtle)] md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead className="ims-table-head">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-2 font-semibold">Supplier SKU</th>
                  <th className="px-4 py-2 font-semibold">Internal Part</th>
                  <th className="px-4 py-2 font-semibold">Pack Quantity</th>
                  <th className="px-4 py-2 font-semibold">Tiered Price Breaks (Converted to Base)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {supplierParts.map((sp) => (
                  <tr key={sp.id}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-[var(--text-primary)]">{sp.sku}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/parts/${sp.partId}`}
                        className="font-mono text-[var(--brand-primary)] hover:underline"
                      >
                        {sp.partIpn}
                      </Link>
                      <span className="ml-2 text-[12px] text-[var(--text-secondary)]">{sp.partName}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      1 pack = {sp.packQuantity} {sp.partUnit}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">
                      {sp.priceBreaks.map((pb) => (
                        <div key={pb.id}>
                          ≥{pb.minQuantity}: {pb.unitPrice} {pb.currency} (
                          <span className="text-[var(--brand-primary)]">
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
      {/* Dialog: Edit Contact */}
      <Dialog open={editingContact !== null} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateContact} className="space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                type="text"
                required
                value={editContactForm.name}
                onChange={(e) => setEditContactForm({ ...editContactForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={editContactForm.email}
                onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Role / Title</Label>
                <Input
                  type="text"
                  value={editContactForm.roleTitle}
                  onChange={(e) =>
                    setEditContactForm({ ...editContactForm, roleTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  type="text"
                  value={editContactForm.phone}
                  onChange={(e) =>
                    setEditContactForm({ ...editContactForm, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]">
              <Checkbox
                checked={editContactForm.primaryContact}
                onCheckedChange={(v) =>
                  setEditContactForm({ ...editContactForm, primaryContact: Boolean(v) })
                }
              />
              <span>Primary contact</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingContact(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Address */}
      <Dialog open={editingAddress !== null} onOpenChange={(open) => !open && setEditingAddress(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAddress} className="space-y-3">
            <div className="space-y-1">
              <Label>Label *</Label>
              <Input
                type="text"
                required
                value={editAddrForm.label}
                onChange={(e) => setEditAddrForm({ ...editAddrForm, label: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Street Address *</Label>
              <Input
                type="text"
                required
                value={editAddrForm.line1}
                onChange={(e) => setEditAddrForm({ ...editAddrForm, line1: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Address Line 2</Label>
              <Input
                type="text"
                value={editAddrForm.line2}
                onChange={(e) => setEditAddrForm({ ...editAddrForm, line2: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  type="text"
                  value={editAddrForm.city}
                  onChange={(e) => setEditAddrForm({ ...editAddrForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>State / Region</Label>
                <Input
                  type="text"
                  value={editAddrForm.stateRegion}
                  onChange={(e) =>
                    setEditAddrForm({ ...editAddrForm, stateRegion: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Postal Code</Label>
                <Input
                  type="text"
                  value={editAddrForm.postalCode}
                  onChange={(e) =>
                    setEditAddrForm({ ...editAddrForm, postalCode: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input
                  type="text"
                  value={editAddrForm.country}
                  onChange={(e) =>
                    setEditAddrForm({ ...editAddrForm, country: e.target.value.toUpperCase() })
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]">
                <Checkbox
                  checked={editAddrForm.primaryShipping}
                  onCheckedChange={(v) =>
                    setEditAddrForm({ ...editAddrForm, primaryShipping: Boolean(v) })
                  }
                />
                <span>Primary shipping</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-border px-3 py-2 text-[12px]">
                <Checkbox
                  checked={editAddrForm.primaryBilling}
                  onCheckedChange={(v) =>
                    setEditAddrForm({ ...editAddrForm, primaryBilling: Boolean(v) })
                  }
                />
                <span>Primary billing</span>
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingAddress(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Contact / Address */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "contact" ? "contact" : "address"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.label}</strong> from this company.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
