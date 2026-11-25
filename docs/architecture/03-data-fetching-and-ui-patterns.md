# 03 — Data Fetching, Entitlements & UI Patterns

Conventions for API calls, TanStack Query state, plan/permission gating, Edit Mode protection, and shared `@ims/ui` components.

---

## 1. Typed BFF Client (`@ims/api-client`)

- Always call backend endpoints via `apiFetch<T>("/api/v1/...", init)` from `@ims/api-client`.
- `apiFetch`:
  - Sends `credentials: "same-origin"`.
  - Automatically sets `Content-Type: application/json` when `body` is present and **not** `FormData` (allowing browser multipart boundary generation for file uploads).
  - Throws `ApiError(status, code, message, feature)` on non-2xx responses so UI banners can surface exact backend error codes (`FEATURE_NOT_ENABLED`, `LIMIT_REACHED`, `VALIDATION_ERROR`, etc.).

---

## 2. TanStack Query & Live Updates (`apps/client/lib/entitlements.tsx`)

- `AppQueryProvider` configures a shared `QueryClient` with `staleTime: 15_000` and `retry: 1`.
- `EntitlementProvider` fetches `GET /api/v1/me` under query key `["me"]`, exposing `enabledFeatures`, `permissions`, `planName`, and tenant context to the entire app.
- Use `useEntitlements()` for imperative checks (`hasFeature("MANUFACTURING")`, `hasPermission("PART:UPDATE")`).
- Use `<FeatureGate feature="..." fallback="hide" | "not-in-plan">` declaratively:
  - `fallback="hide"` (default): Hides buttons, tabs, or nav entries for disabled features.
  - `fallback="not-in-plan"`: Renders `<NotInPlan />` upgrade prompt on dedicated feature pages.

---

## 3. Edit Mode Guard (`apps/client/lib/edit-mode.tsx`)

- Inline editing and destructive/mutating controls on catalog and stock detail views are guarded by `useEditMode()`.
- `canUseEditMode` is true only when the user holds `PART:UPDATE`, `STOCK:UPDATE`, or `ADMIN:VIEW`.
- Edit Mode state persists per browser tab in `sessionStorage` (`ims.editMode`), preventing accidental mutations during read-only browsing.

---

## 4. Shared `@ims/ui` Components

- **`DataTable`**: Built on `@tanstack/react-table` v8 for sortable, filterable, paginated tabular views.
- **`ImportWizard`**: Reusable two-step CSV/XLSX bulk import workflow (preview & column mapping -> validated commit) backed by `/api/v1/import/*`.
- **`primitives`**: Shared buttons, badges, cards, dialogs, `NotInPlan` banner, and Tailwind `cn()` utilities.
