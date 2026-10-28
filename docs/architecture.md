# Architecture

How DACTIVOS is built. What it must do is in [requirements.md](requirements.md); the reasons behind each significant choice are in the [ADRs](decisions/README.md).

## 1. Principles

- **The database is the authorization boundary.** App users cannot read or write tables; they call PostgreSQL functions that check the caller's role first and apply the business rules inside one transaction (R1, [ADR 0002](decisions/0002-authorization-in-the-database.md)). The web app checks permissions too, to hide what a role cannot do and to fail early, but it is never the only check.
- **Critical rules live in constraints, not only in code.** Partial unique indexes, `CHECK` constraints and triggers keep the inventory consistent even under concurrent requests (R2–R9, [ADR 0003](decisions/0003-one-open-delivery.md)).
- **No privileged key in the web app.** The browser talks only to the Next.js server, and the server talks to Supabase with the signed-in user's session and the public key. The service key exists only in the Edge Function environment and in terminal commands.
- **History is written by the database.** Audit rows are inserted by triggers and functions in the same transaction as the change; the web app cannot forge or skip them (R11, [ADR 0005](decisions/0005-audit-written-by-the-database.md)).
- **Small, readable modules.** Server actions validate input with Zod and call one RPC; parsers turn RPC results into typed data; screen components contain no authorization logic.

## 2. Runtime view

```text
Browser ──► Next.js (App Router, Server Components, Server Actions)
              │  proxy.ts: refreshes the Supabase session cookie on every request
              │  requirePermission(): user from Auth + role from current_app_role()
              ▼
            Supabase
              ├─ Auth (GoTrue): email and password, invitations, sessions
              ├─ PostgREST: exposes only the RPCs granted to `authenticated`
              ├─ PostgreSQL: tables (RLS on, no grants), SECURITY DEFINER functions, triggers
              └─ Edge Function `dactivos-invite`: invites with the service key, links the profile
                 with the inviting administrator's JWT
```

Every private page and action follows the same path:

1. `src/proxy.ts` validates and refreshes the session cookie (`getClaims`).
2. The page or action calls `requirePermission(permission)` (`src/lib/auth/require-permission.ts`): it reads the user with `getUser()`, then the role with the `current_app_role()` RPC, which returns `NULL` for an inactive or missing profile. Without a user it redirects to `/login`; without the permission, to `/acceso-denegado`.
3. Server actions validate the form with Zod, then call one RPC with the user's session. The RPC checks the role again and enforces the rules.
4. Errors are mapped to Spanish messages by SQLSTATE; SQL text never reaches the browser.

Pages render with Partial Prerendering (`cacheComponents`): a static shell plus a dynamic part behind `Suspense` that calls `connection()` before reading the session, so no user data is ever prerendered.

## 3. Project structure

```text
src/
  app/
    (auth)/            login, invitation acceptance, set password
    (dashboard)/       private screens: dashboard, activos, empleados, departamentos, asignaciones,
                       mantenimiento, historial, reportes, usuarios, configuracion
    actions/           server actions (operations, assets lifecycle, users, invitations, sign-out)
    api/reportes/      CSV export route
  components/          one board per screen, layout, shared operation primitives, a few UI parts
  lib/
    auth/              roles and permissions, requirePermission, password rule, sign-in throttling
    supabase/          server client, proxy session refresh, public configuration
    operations/ history/ users/ dashboard/ reports/
                       RPC result parsers, server data loaders, dashboard summary, CSV builder
  proxy.ts             session refresh for every request
supabase/
  migrations/          the database schema: tables, constraints, functions, triggers, grants
  functions/           dactivos-invite Edge Function
  templates/           invitation email
  config.toml          local Supabase used for development and CI
scripts/               env:local, demo:setup and the users / create-admin commands
tests/
  unit/                parsers, permissions, server actions with mocks, CSV, throttling, headers
  source/              checks over the source: rendering boundaries, forbidden patterns
  integration/         authorization, business rules, concurrency and accounts on a real database
```

## 4. Data model

```text
departments 1──N employees 1──N asset_assignments N──1 assets N──1 asset_categories
asset_assignments 1──1 asset_return_inspections 1──0..1 asset_maintenance_cases
asset_maintenance_cases 1──0..1 asset_release_validations 1──0..1 asset_release_consumptions
auth.users 1──0..1 profiles (role, is_active)
```

| Table                        | Content                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `assets`                     | Internal code, serial, category, name, description, status                              |
| `asset_categories`           | `HANDHELD` and `COMPUTER` (created by the migration)                                     |
| `departments`, `employees`   | The people who receive assets and their departments; both can be deactivated             |
| `asset_assignments`          | Each delivery: asset, employee, category at that moment, who delivered and who received  |
| `asset_return_inspections`   | Condition on return (`GOOD` / `DAMAGED`) and notes                                       |
| `asset_maintenance_cases`    | Opened by a damaged return; `OPEN` or `RESOLVED` with notes                              |
| `asset_release_validations`  | The physical check that releases a repaired asset                                        |
| `asset_release_consumptions` | Marks a validation as used, so it releases the asset only once                           |
| `profiles`                   | Role and status of each Auth account                                                     |
| `*_audit_log`, `asset_lifecycle_log` | Deliveries, maintenance, catalog changes, account changes, retirements           |
| `report_export_log`          | Who exported which CSV report, with its date range and row count; append-only            |

Rules enforced by the database:

- `assignments_one_open_per_asset`: unique `(asset_id) WHERE returned_at IS NULL` (R2).
- `assignments_one_open_category_per_employee`: unique `(employee_id, category_code) WHERE returned_at IS NULL` (R3).
- Unique indexes on `upper(internal_code)`, `upper(serial_number)`, `upper(employee_code)` and `lower(name)` of departments (R8).
- Triggers that allow only the status transitions of R5, open the maintenance case of a damaged return (R6), consume a release once (R7), protect employees with open deliveries and departments with active employees (R9), and make the retirement log immutable (R11).
- Deferred constraint triggers that check, at commit, that an asset's status matches its open delivery.
- `CHECK` constraints for lengths, formats, the consistency of returned and resolved fields, and reason lengths (R10).

The schema is in two migrations: `20261013000000_initial_schema.sql` (the application schema) and `20261028000000_terminal_account_management.sql` (the service-only function used by the terminal commands, [ADR 0007](decisions/0007-local-database-and-terminal-accounts.md)).

## 5. Authentication and accounts

- Sign-in with email and password through Supabase Auth. The session lives in a cookie written by `@supabase/ssr` and hardened by the app: `httpOnly`, `Secure` in production, `SameSite=Lax`, 12 hours. Auth ends sessions after 12 hours or 4 hours without use ([ADR 0012](decisions/0012-session-hardening.md)). There is no public sign-up.
- The role comes from `profiles` on every request and only while the token's Auth session is alive, so deactivating an account or signing out cuts access on the next request, also for a copied token (R13).
- `/establecer-contrasena` only accepts the session opened by an invitation link in the last 15 minutes; passwords are reset by an administrator from the terminal.
- Invitations ([ADR 0006](decisions/0006-invitations-through-an-edge-function.md)): the Usuarios screen calls the `dactivos-invite` Edge Function with the administrator's JWT. It checks the caller is an active ADMIN, asks Auth to send the invitation, and links an **inactive** profile through an audited RPC called with the administrator's own JWT. The email opens `/aceptar-invitacion`, which consumes the token only when the person presses the button, so link scanners cannot use it up.
- Terminal commands use the service key of the local Supabase (read from the Supabase CLI, never from `.env.local`) and the `dactivos_terminal_set_access` function, which only `service_role` can run.
- Sign-in attempts are limited per client IP and per email in the server's memory ([ADR 0010](decisions/0010-sign-in-throttling.md)).

## 6. Technology stack

| Layer       | Technology                                                      |
| ----------- | --------------------------------------------------------------- |
| Language    | TypeScript (strict), Node.js ≥ 22.18                            |
| Web         | Next.js 16 (App Router, Server Actions, Partial Prerendering), React 19 |
| UI          | Tailwind CSS 4, Base UI primitives, lucide-react icons          |
| Validation  | Zod 4                                                           |
| Data        | Supabase: PostgreSQL 17, Auth, PostgREST, Edge Functions (Deno) |
| Local setup | Supabase CLI with Docker                                        |
| Tests       | `node:test` (unit, source and integration)                      |
| Quality     | ESLint, Prettier, TypeScript, GitHub Actions, Dependabot        |

## 7. Design decisions

| ID  | Decision                                                                                     | ADR                                                                 |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| D1  | Next.js with Supabase                                                                        | [0001](decisions/0001-technology-stack.md)                          |
| D2  | Tables closed to app users; everything through role-checking functions                       | [0002](decisions/0002-authorization-in-the-database.md)             |
| D3  | One open delivery per asset and per employee and category, by partial unique indexes         | [0003](decisions/0003-one-open-delivery.md)                         |
| D4  | Damaged returns go to maintenance; release needs a resolved case and a physical check        | [0004](decisions/0004-maintenance-and-physical-release.md)          |
| D5  | Audit rows written by the database in the same transaction                                   | [0005](decisions/0005-audit-written-by-the-database.md)             |
| D6  | Invitations through an Edge Function; invited profiles start inactive                       | [0006](decisions/0006-invitations-through-an-edge-function.md)      |
| D7  | Local Supabase for development and CI; accounts from the terminal through a service-only RPC | [0007](decisions/0007-local-database-and-terminal-accounts.md)      |
| D8  | Demo access with generated passwords and fictitious data created through the app's RPCs     | [0008](decisions/0008-demo-access.md)                               |
| D9  | Content Security Policy without nonces because of Partial Prerendering                       | [0009](decisions/0009-content-security-policy.md)                   |
| D10 | Sign-in throttling per client IP and per email in the app                                    | [0010](decisions/0010-sign-in-throttling.md)                        |
| D11 | Dependency audit, secret scanning and reviewed Dependabot updates in CI                      | [0011](decisions/0011-supply-chain-in-ci.md)                        |
| D12 | Hardened session cookie, live-session role check and password creation only after an invitation | [0012](decisions/0012-session-hardening.md)                     |
| D13 | Security events in the server log; every CSV export audited before the file is delivered     | [0013](decisions/0013-security-events-and-export-audit.md)      |
