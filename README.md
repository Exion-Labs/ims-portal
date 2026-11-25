# IMS Portal (`ims-frontend`)

pnpm workspace monorepo powering the **IMS Tenant Portal** (`@ims/client`) and **IMS Platform Operator Console** (`@ims/platform`), built with **Next.js 15**, **React 19**, **TypeScript 5.7**, **TanStack Query v5**, and **Tailwind CSS v4**.

---

## Workspace Structure

| Workspace Package | Path | Port | Purpose |
| :--- | :--- | :--- | :--- |
| `@ims/client` | `apps/client` | `3000` | Multi-tenant inventory, manufacturing, purchasing & fulfillment portal |
| `@ims/platform` | `apps/platform` | `3001` | Operator console for tenant provisioning, plans, outbox & support impersonation |
| `@ims/api-client` | `packages/api-client` | — | `apiFetch` BFF client, `ApiError`, TypeScript DTOs & generated OpenAPI schema types |
| `@ims/ui` | `packages/ui` | — | Shared UI primitives, `DataTable` (TanStack Table v8), and `ImportWizard` |
| `@ims/config` | `packages/config` | — | Shared `tsconfig.base.json` configuration |

---

## Local Development

### Prerequisites
- **Node.js 20+** and **pnpm 10.6.5**
- Running `ims-core-management` backend at `http://localhost:8080`

### Commands
```bash
pnpm install
pnpm dev              # Starts @ims/client (:3000) and @ims/platform (:3001) in parallel
pnpm dev:client       # Starts only Tenant Portal (:3000)
pnpm dev:platform     # Starts only Platform Console (:3001)
pnpm typecheck        # Typechecks all workspace packages
pnpm build            # Builds all apps
```

---

## Environment Variables

| Variable | App(s) | Default (Dev) | Purpose |
| :--- | :--- | :--- | :--- |
| `BACKEND_URL` | `@ims/client`, `@ims/platform` | `http://localhost:8080` | Upstream `ims-core-management` base URL |
| `PROXY_SECRET` | `@ims/client` | `ims-dev-bff-proxy-secret-2026` | Shared secret sent as `X-Proxy-Secret` to backend |
| `IMS_PROXY_SECRET` | `@ims/platform` | `ims-dev-bff-proxy-secret-2026` | Shared secret sent as `X-Proxy-Secret` from platform BFF |

---

## Documentation Index

### Suite 1 — Architecture & Best Practices (Developer Guide)
1. [01 — Monorepo & App Architecture](docs/architecture/01-monorepo-and-app-architecture.md)
2. [02 — BFF Auth & Security Model](docs/architecture/02-bff-auth-and-security.md)
3. [03 — Data Fetching, Entitlements & UI Patterns](docs/architecture/03-data-fetching-and-ui-patterns.md)
4. [04 — Developer Playbook & Gotchas](docs/architecture/04-developer-playbook.md)

### Suite 2 — Portal Functional & UX Workflows
1. [01 — Tenant Portal Workflows (`@ims/client`)](docs/domains/01-tenant-portal-workflows.md)
2. [02 — Platform Console Workflows (`@ims/platform`)](docs/domains/02-platform-console-workflows.md)
