# 02 — Platform Console Workflows (`@ims/platform`)

Documents operator-facing workflows in `apps/platform` (`/platform`), backed by `com.ims.platform` in `ims-core-management` (see [Collaboration & Platform Console](../../../ims-core-management/docs/domains/08-collaboration-io-and-platform.md)).

---

## 1. Operator Authentication
- Operators sign in at `/platform` using `POST /platform/api/platform/v1/auth/login`.
- The BFF sets an `HttpOnly` `ims_platform_token` cookie and proxies all subsequent `/platform/api/platform/v1/*` requests with `X-Proxy-Secret`.

---

## 2. Console Tabs & Operator Capabilities (`apps/platform/app/page.tsx`)

| Tab | Capabilities |
| :--- | :--- |
| **Tenants** | • View all tenants (`name`, `slug`, `status`, `baseCurrency`, `planCode`, `userCount`, `createdAt`).<br>• **Provision Tenant**: Create a new tenant + initial admin user + starting plan (`TRIAL`, `STARTER`, `PRO`, `ENTERPRISE`) regardless of `IMS_SIGNUP_ENABLED`.<br>• **Lifecycle Controls**: Suspend (`SUSPENDED`), reactivate (`ACTIVE`), or manage tenant plan subscriptions & feature overrides.<br>• **Support Impersonation**: Launch a 30-minute, audited, read-only `SupportSession` with mandatory reason logging. |
| **Plans** | Inspect seeded plan definitions (`TRIAL`, `STARTER`, `PRO`, `ENTERPRISE`) and each plan's boolean feature flags and numeric quota limits. |
| **Outbox** | Monitor `OutboxEvent` records across tenants (`eventType`, `status`, `attempts`, `lastError`) and manually retry `DEAD_LETTER` events. |
| **Audit Logs** | Inspect immutable `PlatformAuditLog` entries (`actorEmail`, `action`, `targetType`, `targetId`, `occurredAt`) for all operator actions. |
