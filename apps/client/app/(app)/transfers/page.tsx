"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  apiFetch,
  CompanyView,
  LocationView,
  PageResponse,
  ReturnOrderView,
  StockItemView,
  TransferOrderView,
} from "@ims/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Input,
  Label,
  NotInPlan,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
  toast,
  toastApiError,
} from "@ims/ui";
import { useEntitlements } from "@/lib/entitlements";
import { ListToolbar } from "@/components/list-toolbar";
import { ArrowLeftRight, MoreVertical, Plus, RefreshCw, RotateCcw } from "lucide-react";

const STATUS_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  IN_TRANSIT: "warning",
  IN_PROGRESS: "warning",
  COMPLETE: "success",
  CANCELLED: "danger",
};

export default function TransfersAndReturnsPage() {
  const { me, isLoading: entitlementsLoading, hasFeature, hasPermission } = useEntitlements();
  const transfersEnabled = hasFeature("TRANSFERS");
  const returnsEnabled = hasFeature("RETURNS");
  const [tab, setTab] = useState<"transfers" | "returns">("transfers");

  const [transfers, setTransfers] = useState<TransferOrderView[]>([]);
  const [returns, setReturns] = useState<ReturnOrderView[]>([]);
  const [locations, setLocations] = useState<LocationView[]>([]);
  const [customers, setCustomers] = useState<CompanyView[]>([]);
  const [stockItems, setStockItems] = useState<StockItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Transfer modal
  const [showCreateTransfer, setShowCreateTransfer] = useState(false);
  const [trfForm, setTrfForm] = useState({
    sourceLocationId: "",
    destinationLocationId: "",
    stockItemId: "",
    quantity: "1",
    description: "",
  });

  // Create Return modal
  const [showCreateReturn, setShowCreateReturn] = useState(false);
  const [rmaForm, setRmaForm] = useState({
    customerId: "",
    stockItemId: "",
    description: "",
  });

  // Receive Return modal
  const [receivingRma, setReceivingRma] = useState<{ rmaId: string; lineId: string } | null>(null);
  const [receiveLocId, setReceiveLocId] = useState("");
  const [receiveOutcome, setReceiveOutcome] = useState("RESTOCK");

  useEffect(() => {
    if (!entitlementsLoading && !transfersEnabled && returnsEnabled) {
      setTab("returns");
    }
  }, [entitlementsLoading, transfersEnabled, returnsEnabled]);

  const loadData = useCallback(async () => {
    if (entitlementsLoading || (!transfersEnabled && !returnsEnabled)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [trfs, rmas, locs, comps, stocks] = await Promise.all([
        transfersEnabled
          ? apiFetch<PageResponse<TransferOrderView>>("/api/v1/transfer-orders?size=50").then((r) => r.content)
          : Promise.resolve([]),
        returnsEnabled
          ? apiFetch<PageResponse<ReturnOrderView>>("/api/v1/return-orders?size=50").then((r) => r.content)
          : Promise.resolve([]),
        apiFetch<LocationView[]>("/api/v1/stock-locations"),
        apiFetch<PageResponse<CompanyView>>("/api/v1/companies?customer=true&size=200").then((r) => r.content),
        apiFetch<PageResponse<StockItemView>>("/api/v1/stock-items?size=100").then((r) => r.content),
      ]);
      setTransfers(trfs);
      setReturns(rmas);
      setLocations(locs);
      setCustomers(comps);
      setStockItems(stocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfers and returns");
    } finally {
      setLoading(false);
    }
  }, [entitlementsLoading, transfersEnabled, returnsEnabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreateTransferModal() {
    setTrfForm({
      sourceLocationId: "",
      destinationLocationId: "",
      stockItemId: "",
      quantity: "1",
      description: "",
    });
    setShowCreateTransfer(true);
  }

  function openCreateReturnModal() {
    setRmaForm({
      customerId: "",
      stockItemId: "",
      description: "",
    });
    setShowCreateReturn(true);
  }

  async function runAction(fn: () => Promise<unknown>, successTitle?: string) {
    setActionError(null);
    try {
      await fn();
      if (successTitle) toast.success(successTitle);
      await loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
      toastApiError(err, "Action failed");
    }
  }

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const created = await apiFetch<TransferOrderView>("/api/v1/transfer-orders", {
        method: "POST",
        body: JSON.stringify({
          sourceLocationId: trfForm.sourceLocationId,
          destinationLocationId: trfForm.destinationLocationId,
          description: trfForm.description || null,
        }),
      });
      if (trfForm.stockItemId) {
        await apiFetch(`/api/v1/transfer-orders/${created.id}/lines`, {
          method: "POST",
          body: JSON.stringify({
            stockItemId: trfForm.stockItemId,
            quantity: Number(trfForm.quantity),
          }),
        });
      }
      setShowCreateTransfer(false);
    }, "Transfer order created");
  }

  async function handleCreateReturn(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      const created = await apiFetch<ReturnOrderView>("/api/v1/return-orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: rmaForm.customerId,
          description: rmaForm.description || null,
        }),
      });
      if (rmaForm.stockItemId) {
        await apiFetch(`/api/v1/return-orders/${created.id}/lines`, {
          method: "POST",
          body: JSON.stringify({ stockItemId: rmaForm.stockItemId }),
        });
      }
      setShowCreateReturn(false);
    }, "Return order created");
  }

  if (!entitlementsLoading && !transfersEnabled && !returnsEnabled) {
    return <NotInPlan featureKey="TRANSFERS" planName={me?.planName} />;
  }

  return (
    <div className="space-y-6">
      <ListToolbar
        hideActionsOnMobile
        mobileTopAction={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => loadData()}>
                <RefreshCw className="h-4 w-4 text-[var(--brand-primary)]" />
                <span>Refresh</span>
              </DropdownMenuItem>
              {hasPermission("ORDER:CREATE") && returnsEnabled && (
                <DropdownMenuItem onSelect={openCreateReturnModal}>
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  <span>New RMA</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        filters={
          <Tabs value={tab} onValueChange={(v) => setTab(v as "transfers" | "returns")}>
            <TabsList>
              {transfersEnabled && (
                <TabsTrigger value="transfers">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span>Transfer Orders ({transfers.length})</span>
                </TabsTrigger>
              )}
              {returnsEnabled && (
                <TabsTrigger value="returns">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Return Orders ({returns.length})</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        }
        secondaryAction={
          hasPermission("ORDER:CREATE") && returnsEnabled ? (
            <Button
              type="button"
              variant="outline"
              onClick={openCreateReturnModal}
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span>New RMA</span>
            </Button>
          ) : undefined
        }
        primaryAction={
          hasPermission("ORDER:CREATE") && transfersEnabled
            ? {
                label: "New Transfer",
                onClick: openCreateTransferModal,
              }
            : undefined
        }
      />

        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading...</div>
        ) : tab === "transfers" ? (
          transfers.length === 0 ? (
            <EmptyState title="No transfer orders" description="Create a transfer order to move stock between bins." />
          ) : (
            <div className="bg-card border rounded-xl divide-y">
              {transfers.map((trf) => (
                <div key={trf.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{trf.reference}</span>
                      <StatusBadge label={trf.status} tone={STATUS_TONE[trf.status] ?? "neutral"} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trf.sourceLocationPath} → {trf.destinationLocationPath}
                      {trf.description ? ` · ${trf.description}` : ""}
                    </div>
                  </div>
                  {hasPermission("ORDER:UPDATE") && (
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                      {trf.status === "PENDING" && (
                        <button
                          onClick={() =>
                            runAction(
                              () => apiFetch(`/api/v1/transfer-orders/${trf.id}/dispatch`, { method: "POST" }),
                              `Transfer ${trf.reference} dispatched`
                            )
                          }
                          className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted sm:flex-none sm:py-1.5"
                        >
                          Dispatch
                        </button>
                      )}
                      {(trf.status === "PENDING" || trf.status === "IN_TRANSIT") && (
                        <button
                          onClick={() =>
                            runAction(
                              () => apiFetch(`/api/v1/transfer-orders/${trf.id}/receive`, { method: "POST" }),
                              `Transfer ${trf.reference} received`
                            )
                          }
                          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white sm:flex-none sm:py-1.5"
                        >
                          Receive at Destination
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : returns.length === 0 ? (
          <EmptyState title="No return orders" description="Create an RMA to process customer returns." />
        ) : (
          <div className="bg-card border rounded-xl divide-y">
            {returns.map((rma) => (
              <div key={rma.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{rma.reference}</span>
                      <StatusBadge label={rma.status} tone={STATUS_TONE[rma.status] ?? "neutral"} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Customer: {rma.customerName}
                      {rma.description ? ` · ${rma.description}` : ""}
                    </div>
                  </div>
                  {hasPermission("ORDER:UPDATE") && rma.status !== "COMPLETE" && (
                    <button
                      onClick={async () => {
                        try {
                          const detail = await apiFetch<ReturnOrderView>(`/api/v1/return-orders/${rma.id}`);
                          const pendingLine = detail.lines.find((l) => l.outcome === "PENDING");
                          if (pendingLine) {
                            setReceivingRma({ rmaId: rma.id, lineId: pendingLine.id });
                          } else {
                            toast.warning("No pending return lines to receive");
                          }
                        } catch (err) {
                          toastApiError(err, "Failed to load return order");
                        }
                      }}
                      className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground sm:w-auto sm:py-1.5"
                    >
                      Receive &amp; Disposition
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showCreateTransfer} onOpenChange={setShowCreateTransfer}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Transfer Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div className="space-y-1">
                <Label>Source Location *</Label>
                <Combobox
                  value={trfForm.sourceLocationId}
                  onValueChange={(val) => setTrfForm({ ...trfForm, sourceLocationId: val })}
                  placeholder="Select source…"
                  searchPlaceholder="Search locations…"
                  options={locations.map((l) => ({ value: l.id, label: l.path }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Destination Location *</Label>
                <Combobox
                  value={trfForm.destinationLocationId}
                  onValueChange={(val) =>
                    setTrfForm({ ...trfForm, destinationLocationId: val })
                  }
                  placeholder="Select destination…"
                  searchPlaceholder="Search locations…"
                  options={locations.map((l) => ({ value: l.id, label: l.path }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Stock Item *</Label>
                <Combobox
                  value={trfForm.stockItemId}
                  onValueChange={(val) => setTrfForm({ ...trfForm, stockItemId: val })}
                  placeholder="Select stock item…"
                  searchPlaceholder="Search stock items…"
                  options={stockItems
                    .filter((s) => !s.building && Number(s.quantity) > 0)
                    .map((s) => ({
                      value: s.id,
                      label: `${s.partName} (${s.locationPathString ?? "Unassigned"}) · Qty: ${s.quantity}`,
                    }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={trfForm.quantity}
                  onChange={(e) => setTrfForm({ ...trfForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={trfForm.description}
                  onChange={(e) => setTrfForm({ ...trfForm, description: e.target.value })}
                  placeholder="Optional transfer notes…"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTransfer(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !trfForm.sourceLocationId ||
                    !trfForm.destinationLocationId ||
                    !trfForm.stockItemId
                  }
                >
                  Create Transfer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateReturn} onOpenChange={setShowCreateReturn}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Return Order (RMA)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateReturn} className="space-y-4">
              <div className="space-y-1">
                <Label>Customer *</Label>
                <Combobox
                  value={rmaForm.customerId}
                  onValueChange={(val) => setRmaForm({ ...rmaForm, customerId: val })}
                  placeholder="Select customer…"
                  searchPlaceholder="Search customers…"
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Shipped Stock Item *</Label>
                <Combobox
                  value={rmaForm.stockItemId}
                  onValueChange={(val) => setRmaForm({ ...rmaForm, stockItemId: val })}
                  placeholder="Select shipped stock item…"
                  searchPlaceholder="Search stock items…"
                  options={stockItems
                    .filter((s) => s.customerId != null)
                    .map((s) => ({
                      value: s.id,
                      label: `${s.partName} ${s.serialNumber ? `SN:${s.serialNumber}` : `Qty:${s.quantity}`}`,
                    }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={rmaForm.description}
                  onChange={(e) => setRmaForm({ ...rmaForm, description: e.target.value })}
                  placeholder="Optional RMA reason…"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateReturn(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!rmaForm.customerId || !rmaForm.stockItemId}
                >
                  Create RMA
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(receivingRma)}
          onOpenChange={(open) => !open && setReceivingRma(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Receive &amp; Disposition Return</DialogTitle>
            </DialogHeader>
            {receivingRma && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await apiFetch(`/api/v1/return-orders/${receivingRma.rmaId}/lines/${receivingRma.lineId}/receive`, {
                      method: "POST",
                      body: JSON.stringify({
                        quarantineLocationId: receiveLocId || null,
                        outcome: receiveOutcome,
                      }),
                    });
                    setReceivingRma(null);
                  }, `Return received (${receiveOutcome})`);
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Outcome *</Label>
                  <Select value={receiveOutcome} onValueChange={setReceiveOutcome}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESTOCK">RESTOCK (Status: OK)</SelectItem>
                      <SelectItem value="REPAIR">QUARANTINE / REPAIR</SelectItem>
                      <SelectItem value="SCRAP">SCRAP (Status: DAMAGED)</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Receiving / Quarantine Location</Label>
                  <Combobox
                    value={receiveLocId}
                    onValueChange={setReceiveLocId}
                    placeholder="Select location…"
                    searchPlaceholder="Search locations…"
                    options={[
                      { value: "", label: "Default location" },
                      ...locations.map((l) => ({ value: l.id, label: l.path })),
                    ]}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReceivingRma(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">
                    Confirm Receipt
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
        {/* Mobile Floating Create Button */}
        {hasPermission("ORDER:CREATE") && (
          <button
            type="button"
            onClick={tab === "returns" && returnsEnabled ? openCreateReturnModal : openCreateTransferModal}
            aria-label={tab === "returns" && returnsEnabled ? "New RMA" : "New Transfer"}
            title={tab === "returns" && returnsEnabled ? "New RMA" : "New Transfer"}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-lg transition-transform hover:bg-[var(--brand-primary-hover)] active:scale-95 lg:hidden"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>
    );
  }
