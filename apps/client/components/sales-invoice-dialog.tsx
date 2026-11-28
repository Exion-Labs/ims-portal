"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AddressView,
  apiFetch,
  CompanyView,
  ContactView,
  SalesOrderView,
} from "@ims/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ims/ui";
import { Printer } from "lucide-react";

export interface SalesInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: SalesOrderView;
  sellerName: string;
}

export function SalesInvoiceDialog({
  open,
  onOpenChange,
  order,
  sellerName,
}: SalesInvoiceDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [customer, setCustomer] = useState<CompanyView | null>(null);
  const [addresses, setAddresses] = useState<AddressView[]>([]);
  const [contacts, setContacts] = useState<ContactView[]>([]);

  useEffect(() => {
    if (!open || !order.customerId) return;
    let active = true;
    Promise.all([
      apiFetch<CompanyView>(`/api/v1/companies/${order.customerId}`).catch(() => null),
      apiFetch<AddressView[]>(`/api/v1/companies/${order.customerId}/addresses`).catch(() => []),
      apiFetch<ContactView[]>(`/api/v1/companies/${order.customerId}/contacts`).catch(() => []),
    ]).then(([c, addrs, cts]) => {
      if (!active) return;
      setCustomer(c);
      setAddresses(addrs);
      setContacts(cts);
    });
    return () => {
      active = false;
    };
  }, [open, order.customerId]);

  const primaryAddress =
    addresses.find((a) => a.primaryBilling) ??
    addresses.find((a) => a.primaryShipping) ??
    addresses[0] ??
    null;
  const primaryContact =
    contacts.find((c) => c.primaryContact) ?? contacts[0] ?? null;

  const latestShipped =
    order.shipments.find((s) => s.shipped && s.invoiceNumber) ??
    order.shipments.find((s) => s.shipped) ??
    order.shipments[0] ??
    null;

  const invoiceNumber = latestShipped?.invoiceNumber || order.reference;
  const invoiceDate =
    latestShipped?.shipmentDate || order.shipmentDate || order.orderDate || order.createdAt.slice(0, 10);
  const isFinalInvoice = order.status === "SHIPPED" || Boolean(latestShipped?.invoiceNumber);

  const grandTotal = order.lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.salePrice ?? 0),
    0
  );

  function handlePrint() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${isFinalInvoice ? "Invoice" : "Order Bill"} - ${invoiceNumber}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #111827;
        margin: 0;
        padding: 0;
        font-size: 13px;
        line-height: 1.45;
      }
      .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
      .inv-seller { font-size: 20px; font-weight: 700; }
      .inv-title { font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-align: right; }
      .inv-meta { text-align: right; font-size: 12px; color: #4b5563; margin-top: 4px; }
      .inv-grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
      .inv-box-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; border-bottom: 1px solid #d1d5db; padding: 8px 6px; }
      td { border-bottom: 1px solid #e5e7eb; padding: 9px 6px; vertical-align: top; }
      .num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .totals { margin-top: 18px; display: flex; justify-content: flex-end; }
      .totals-box { min-width: 240px; border-top: 2px solid #111827; padding-top: 10px; display: flex; justify-content: space-between; align-items: baseline; font-size: 16px; font-weight: 700; }
      .inv-footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 12px; color: #6b7280; display: flex; justify-content: space-between; }
    </style>
  </head>
  <body>${html}</body>
</html>`);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Customer Bill / Invoice Preview (A4)</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-white p-6 text-gray-900 shadow-xs">
          <div ref={printRef}>
            <div className="inv-header flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-5">
              <div>
                <div className="inv-seller text-xl font-bold text-gray-900">
                  {sellerName || "IMS Store"}
                </div>
              </div>
              <div className="text-right">
                <div className="inv-title text-xl font-bold tracking-wider text-gray-900">
                  {isFinalInvoice ? "INVOICE" : "ORDER BILL"}
                </div>
                <div className="inv-meta mt-1 text-xs text-gray-600 space-y-0.5">
                  <div>
                    Invoice #: <span className="font-mono font-semibold text-gray-900">{invoiceNumber}</span>
                  </div>
                  <div>
                    Order Ref: <span className="font-mono">{order.reference}</span>
                  </div>
                  {order.customerReference && (
                    <div>
                      Customer Ref: <span className="font-mono">{order.customerReference}</span>
                    </div>
                  )}
                  <div>Date: {invoiceDate}</div>
                </div>
              </div>
            </div>

            <div className="inv-grid mb-5 flex justify-between gap-6 text-sm">
              <div>
                <div className="inv-box-label text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Bill To
                </div>
                <div className="font-semibold text-gray-900">{order.customerName}</div>
                {primaryContact && (
                  <div className="text-xs text-gray-600">
                    Attn: {primaryContact.name}
                    {primaryContact.phone ? ` · ${primaryContact.phone}` : ""}
                  </div>
                )}
                {primaryAddress ? (
                  <div className="text-xs text-gray-600">
                    <div>{primaryAddress.line1}</div>
                    {primaryAddress.line2 && <div>{primaryAddress.line2}</div>}
                    <div>
                      {[primaryAddress.city, primaryAddress.stateRegion, primaryAddress.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {primaryAddress.country && <div>{primaryAddress.country}</div>}
                  </div>
                ) : (
                  customer?.phone && <div className="text-xs text-gray-600">{customer.phone}</div>
                )}
                {customer?.email && <div className="text-xs text-gray-600">{customer.email}</div>}
                {customer?.taxId && (
                  <div className="text-xs text-gray-600 font-mono">Tax ID: {customer.taxId}</div>
                )}
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-2 px-1.5 text-left">#</th>
                  <th className="py-2 px-1.5 text-left">Item</th>
                  <th className="py-2 px-1.5 text-right">Qty</th>
                  <th className="py-2 px-1.5 text-right">Unit Price ({order.currency})</th>
                  <th className="py-2 px-1.5 text-right">Total ({order.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.lines.map((line, idx) => {
                  const unitPrice = Number(line.salePrice ?? 0);
                  const lineTotal = Number(line.quantity) * unitPrice;
                  return (
                    <tr key={line.id}>
                      <td className="py-2 px-1.5 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-1.5">
                        <div className="font-medium text-gray-900">{line.partName}</div>
                        {line.partIpn && (
                          <div className="font-mono text-xs text-gray-500">{line.partIpn}</div>
                        )}
                      </td>
                      <td className="num py-2 px-1.5 text-right font-mono">
                        {Number(line.quantity).toLocaleString()} {line.partUnit ?? ""}
                      </td>
                      <td className="num py-2 px-1.5 text-right font-mono">
                        {line.salePrice != null ? unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                      <td className="num py-2 px-1.5 text-right font-mono font-semibold">
                        {line.salePrice != null ? lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="totals mt-5 flex justify-end">
              <div className="totals-box flex min-w-[240px] items-baseline justify-between border-t-2 border-gray-900 pt-2.5 text-base font-bold">
                <span>Grand Total</span>
                <span className="font-mono">
                  {order.currency}{" "}
                  {grandTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="mt-6 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Notes: </span>
                {order.notes}
              </div>
            )}

            <div className="inv-footer mt-8 flex justify-between border-t border-gray-200 pt-3 text-xs text-gray-500">
              <span>Thank you for your business!</span>
              <span>Status: {order.status}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span>Print A4 Invoice</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
