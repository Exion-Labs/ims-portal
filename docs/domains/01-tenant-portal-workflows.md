# 01 — Tenant Portal Workflows (`@ims/client`)

Maps every route in `apps/client` to its functional workflow, feature gate, and canonical backend specification in `ims-core-management/docs/domains/`.

---

## 1. Authentication & Onboarding (`app/(auth)/`)

| Route | Workflow | Backend Spec |
| :--- | :--- | :--- |
| `/login` | Tenant user sign-in; sets `HttpOnly` access & refresh cookies via `/api/auth/login` | [Identity & Tenancy](../../../ims-core-management/docs/domains/01-identity-tenancy-and-governance.md) |
| `/register` | Self-service tenant signup (when `IMS_SIGNUP_ENABLED=true` on backend) | [Identity & Tenancy](../../../ims-core-management/docs/domains/01-identity-tenancy-and-governance.md) |
| `/accept-invite` | Invited user onboarding with token & password setup | [Identity & Tenancy](../../../ims-core-management/docs/domains/01-identity-tenancy-and-governance.md) |
| `/forgot-password` | Password reset request & token completion | [Identity & Tenancy](../../../ims-core-management/docs/domains/01-identity-tenancy-and-governance.md) |

---

## 2. Core Operations & Execution (`app/(app)/`)

| Route | Feature Gate | Key User Capabilities | Backend Spec |
| :--- | :--- | :--- | :--- |
| `/` | Always On | KPI dashboard, quick links, Command Palette (`Cmd+K`) global search | [Domain Map](../../../ims-core-management/docs/domains/00-domain-map-and-entitlements.md) |
| `/parts`, `/parts/[id]` | `PARTS` | Hierarchical category tree (`ltree`), part list/detail, Edit Mode mutations, SI parameters, BOM tree & cost rollup (`MANUFACTURING` / `PRICING_ROLLUP`), attachments/notes, CSV/XLSX `ImportWizard` (`IMPORT_EXPORT`) | [Catalog, BOM & Costing](../../../ims-core-management/docs/domains/02-catalog-bom-and-costing.md) |
| `/stock` | `STOCK` | Hierarchical warehouse locations, batch/serial stock table, atomic count/add/remove/transfer/split/merge/serialize (`SERIAL_TRACKING`), QC test results (`QUALITY_TESTS`), barcode generation & scan (`BARCODES`) | [Warehouse & Stock](../../../ims-core-management/docs/domains/04-warehouse-stock-qc-and-barcodes.md) |
| `/companies`, `/companies/[id]` | `COMPANIES` | Supplier/manufacturer/customer directory, contacts, addresses, MPN/SKU supplier parts, tiered price breaks, FX rates (`MULTI_CURRENCY`) | [Partners & Sourcing](../../../ims-core-management/docs/domains/03-partners-sourcing-and-fx.md) |
| `/purchasing`, `/purchasing/[id]` | `PURCHASING` | PO creation with auto-pricing, issuing (`PENDING -> PLACED`), inbound batch/serial receiving, printable PO | [Purchasing & Receiving](../../../ims-core-management/docs/domains/05-purchasing-and-receiving.md) |
| `/manufacturing`, `/manufacturing/[id]` | `MANUFACTURING` | Build orders, `maxBuildable` check, recursive child builds, manual/FIFO allocation, WIP outputs, serialized installation & completion | [Manufacturing & Builds](../../../ims-core-management/docs/domains/06-manufacturing-and-builds.md) |
| `/sales`, `/sales/[id]` | `SALES` (+ `RETURNS`) | Sales orders, stock allocation, shipments & partial lot splitting, RMA intake & disposition (`RETURNS`) | [Fulfillment & Returns](../../../ims-core-management/docs/domains/07-fulfillment-returns-and-transfers.md) |
| `/transfers` | `TRANSFERS` | Two-stage inter-warehouse transfers (`PENDING -> IN_TRANSIT -> COMPLETE`) | [Fulfillment & Transfers](../../../ims-core-management/docs/domains/07-fulfillment-returns-and-transfers.md) |

---

## 3. Tenant Administration (`app/(app)/settings/*`)

| Route | Feature Gate | Capabilities |
| :--- | :--- | :--- |
| `/settings/organization` | Always On | Organization profile, base currency, tenant preferences |
| `/settings/users` | Always On | User list, invitations (`MAX_USERS` quota), activation/deactivation |
| `/settings/roles` | Always On | System & custom role management, feature-filtered permission matrix |
| `/settings/api-tokens` | `API_ACCESS` | Create/revoke scoped `ims_pat_*` Personal Access Tokens |
| `/settings/sequences` | Always On | Customize `PO`, `SO`, `BO`, `RMA`, `TRF` reference formats |
| `/settings/audit-log` | Always On | Search immutable `@Audited` change diffs & export CSV |
| `/settings/plan` | Always On | View current subscription plan, enabled feature flags & live quota usage |
| `/settings/integrations` | `WEBHOOKS` / `CUSTOM_REPORTS` | Manage HMAC-signed outbound webhooks & custom PDF report templates |
