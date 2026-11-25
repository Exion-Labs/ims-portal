# 04 — Developer Playbook & Gotchas

Practical guide for adding new routes, updating OpenAPI types, and avoiding known configuration pitfalls in `ims-portal`.

---

## 1. Adding a New Tenant Feature Route

1. **Create the Page**: Add `apps/client/app/(app)/<feature>/page.tsx` (and `[id]/page.tsx` for detail views).
2. **Gate the Page**: Wrap the page content in `<FeatureGate feature="<FEATURE_KEY>" fallback="not-in-plan">` and check `hasPermission("<DOMAIN>:<ACTION>")` for mutating buttons.
3. **Register Navigation & Command Palette**:
   - Add the route to `NAV_GROUPS` (or `SETTINGS_NAV`) in `apps/client/lib/constants/navigation.ts` with its `feature` key.
   - Add a `QUICK_LINKS` entry so `Cmd+K` / `CommandPalette` surfaces the page immediately.
4. **Use `apiFetch` & TanStack Query**: Define query keys consistently and invalidate affected keys on `useMutation` `onSuccess`.

---

## 2. Regenerating OpenAPI Types

`@ims/api-client` includes `packages/api-client/src/generated/tenant-openapi.d.ts` generated via `openapi-typescript`.

> **Known Path Note**: `packages/api-client/package.json` currently points `generate:types` at `../../../ims-backend/openapi-tenant.json`. When generating directly from the sibling `ims-core-management` repo or running backend, point `openapi-typescript` to the exported OpenAPI JSON or live `http://localhost:8080/v3/api-docs` output:
> ```bash
> pnpm --filter @ims/api-client exec openapi-typescript http://localhost:8080/v3/api-docs -o src/generated/tenant-openapi.d.ts
> ```

---

## 3. Environment Variable Gotchas

- **Mismatched Proxy Secret Names**:
  - `@ims/client` reads `PROXY_SECRET` (default `ims-dev-bff-proxy-secret-2026`).
  - `@ims/platform` reads `IMS_PROXY_SECRET` (default `ims-dev-bff-proxy-secret-2026`).
  - `ims-core-management` reads `IMS_PROXY_SECRET`.
  - In production deployments, ensure **both** `PROXY_SECRET` (on `@ims/client`) and `IMS_PROXY_SECRET` (on `@ims/platform` and backend) are set to the same secret value.
- **Next.js `basePath` in `@ims/platform`**: Platform API calls from the browser target `/platform/api/platform/v1/*` so they route through `@ims/platform`'s Next.js BFF rather than colliding with `@ims/client`.
