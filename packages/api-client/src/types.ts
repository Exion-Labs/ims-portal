export type FeatureType = "BOOLEAN" | "LIMIT";

export interface EffectiveFeature {
  featureKey: string;
  type: FeatureType;
  enabled: boolean;
  limitValue: number | null;
  source: "CORE" | "PLAN" | "OVERRIDE" | "OVERRIDE_TRIAL";
  overrideReason: string | null;
  overrideExpiresAt: string | null;
  description: string;
}

export interface MeResponse {
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  baseCurrency: string;
  timezone: string;
  permissions: string[];
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  enabledFeatures: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  featureDetails: EffectiveFeature[];
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface UserWithRolesView {
  id: string;
  email: string;
  fullName: string;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleSummary[];
}

export interface RoleView {
  id: string;
  name: string;
  description: string;
  systemRole: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiTokenView {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface CreatedApiTokenResponse {
  id: string;
  name: string;
  tokenPrefix: string;
  rawToken: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export interface ReferenceSequenceView {
  id: string;
  sequenceKey: string;
  prefix: string;
  padding: number;
  nextValue: number;
}

export interface TenantSettingView {
  id: string;
  settingKey: string;
  settingValue: string;
  valueType: "STRING" | "INTEGER" | "BOOLEAN" | "JSON";
}

export interface AuditEventView {
  id: string;
  occurredAt: string;
  actorType: "USER" | "API_TOKEN" | "SYSTEM_JOB" | "PLATFORM_SUPPORT";
  actorId: string | null;
  actorName: string | null;
  supportSessionId: string | null;
  requestId: string | null;
  ip: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  changes: Record<string, { from: unknown; to: unknown } | unknown>;
  reason: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ImportSessionView {
  sessionId: string;
  tenantId: string;
  targetType: string;
  fileName: string;
  detectedColumns: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
  createdAt: string;
}

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface DryRunReport {
  sessionId: string;
  targetType: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: RowValidationError[];
  previewMappedRows: Record<string, string>[];
}

export interface CommitResult {
  sessionId: string;
  targetType: string;
  committedRows: number;
}

export interface SearchResultItem {
  category: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface CategoryView {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  path: string;
  pathString: string;
  depth: number;
  structural: boolean;
  defaultLocationId: string | null;
  icon: string | null;
  directPartCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParameterTemplateView {
  id: string;
  name: string;
  units: string | null;
  description: string | null;
  choices: string | null;
  checkbox: boolean;
  defaultCategoryId: string | null;
  defaultCategoryPath: string | null;
  createdAt: string;
}

export interface PartParameterView {
  id: string;
  partId: string;
  templateId: string;
  templateName: string;
  templateUnits: string | null;
  checkbox: boolean;
  valueText: string;
  valueNumeric: number | null;
  updatedAt: string;
}

export interface PartView {
  id: string;
  ipn: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryPathString: string | null;
  revision: string;
  revisionOfId: string | null;
  variantOfId: string | null;
  unit: string;
  minimumStock: number;
  active: boolean;
  locked: boolean;
  assembly: boolean;
  component: boolean;
  trackable: boolean;
  purchaseable: boolean;
  salable: boolean;
  virtual: boolean;
  metadata: Record<string, unknown>;
  parameters: PartParameterView[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteView {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface AttachmentView {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  status: "PENDING" | "READY";
  comment: string | null;
  createdAt: string;
}

export interface LocationView {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  path: string;
  pathString: string;
  depth: number;
  locationType: string;
  structural: boolean;
  externalLocation: boolean;
  customBarcode: string | null;
  directItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockSummaryView {
  partId: string;
  inStock: number;
  allocatedToBuilds: number;
  allocatedToSales: number;
  availableStock: number;
  onOrder: number;
  inProduction: number;
}

export interface StockItemView {
  id: string;
  partId: string;
  partIpn: string;
  partName: string;
  partUnit: string;
  partTrackable: boolean;
  locationId: string | null;
  locationName: string | null;
  locationPathString: string | null;
  parentItemId: string | null;
  installedInId: string | null;
  customerId: string | null;
  quantity: number;
  serialNumber: string | null;
  batchCode: string | null;
  status: string;
  expiryDate: string | null;
  purchasePrice: number | null;
  currency: string | null;
  packaging: string | null;
  building: boolean;
  customBarcode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockTrackingView {
  id: string;
  stockItemId: string;
  partId: string;
  trackingType: string;
  quantityDelta: number;
  quantityAfter: number;
  locationId: string | null;
  locationPathString: string | null;
  notes: string | null;
  userId: string | null;
  createdAt: string;
}

export interface PartTestTemplateView {
  id: string;
  partId: string;
  testName: string;
  description: string | null;
  required: boolean;
  requiresValue: boolean;
  requiresAttachment: boolean;
  createdAt: string;
}

export interface StockItemTestResultView {
  id: string;
  stockItemId: string;
  templateId: string | null;
  testName: string;
  passed: boolean;
  value: string | null;
  notes: string | null;
  attachmentId: string | null;
  testedBy: string | null;
  createdAt: string;
}

export interface ScanResolutionResult {
  matchedType: "STOCK_ITEM" | "STOCK_LOCATION" | "PART" | "SUPPLIER_PART";
  entityId: string;
  code: string;
  title: string;
  subtitle: string;
  href: string;
  detail: unknown;
}

export interface ExchangeRateView {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  updatedAt: string;
}

export interface CompanyView {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  defaultCurrency: string;
  supplier: boolean;
  manufacturer: boolean;
  customer: boolean;
  internalCompany: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactView {
  id: string;
  companyId: string;
  name: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  primaryContact: boolean;
}

export interface AddressView {
  id: string;
  companyId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string;
  primaryShipping: boolean;
  primaryBilling: boolean;
}

export interface ManufacturerPartView {
  id: string;
  partId: string;
  partIpn: string;
  partName: string;
  manufacturerId: string;
  manufacturerName: string;
  mpn: string;
  description: string | null;
  datasheetUrl: string | null;
  createdAt: string;
}

export interface SupplierPriceBreakView {
  id: string;
  supplierPartId: string;
  minQuantity: number;
  unitPrice: number;
  currency: string;
  tenantBaseCurrency: string;
  convertedPackPriceInBase: number;
  convertedInternalUnitPriceInBase: number;
}

export interface SupplierPartView {
  id: string;
  partId: string;
  partIpn: string;
  partName: string;
  partUnit: string;
  supplierId: string;
  supplierName: string;
  manufacturerPartId: string | null;
  manufacturerMpn: string | null;
  sku: string;
  description: string | null;
  packQuantity: number;
  moq: number;
  multiple: number;
  leadTimeDays: number | null;
  currency: string;
  customBarcode: string | null;
  active: boolean;
  priceBreaks: SupplierPriceBreakView[];
  createdAt: string;
}

export interface PurchaseOrderLineView {
  id: string;
  purchaseOrderId: string;
  supplierPartId: string;
  supplierSku: string;
  partId: string;
  partIpn: string;
  partName: string;
  partUnit: string;
  quantity: number;
  received: number;
  remaining: number;
  packQuantity: number;
  internalQuantityTotal: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
  lineTotalInBase: number;
  tenantBaseCurrency: string;
  destinationLocationId: string | null;
  destinationLocationPath: string | null;
  targetDate: string | null;
  reference: string | null;
  notes: string | null;
}

export interface PurchaseOrderExtraLineView {
  id: string;
  purchaseOrderId: string;
  reference: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
}

export interface PurchaseOrderView {
  id: string;
  reference: string;
  description: string | null;
  supplierId: string;
  supplierName: string;
  supplierReference: string | null;
  status: "PENDING" | "PLACED" | "IN_PROGRESS" | "COMPLETE" | "ON_HOLD" | "CANCELLED";
  currency: string;
  tenantBaseCurrency: string;
  totalAmount: number;
  totalAmountInBase: number;
  destinationLocationId: string | null;
  destinationLocationPath: string | null;
  issueDate: string | null;
  targetDate: string | null;
  completeDate: string | null;
  notes: string | null;
  lines: PurchaseOrderLineView[];
  extraLines: PurchaseOrderExtraLineView[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceiveLineResult {
  purchaseOrderId: string;
  orderStatus: string;
  createdStockItems: StockItemView[];
}
