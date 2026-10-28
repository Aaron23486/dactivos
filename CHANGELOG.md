# Changelog

Notable changes to DACTIVOS. Versions follow [Semantic Versioning](https://semver.org/); before 1.0.0 the work is grouped by stage.

## [1.1.0] — 2026-10-28

Security fixes from a pre-production review (no critical or high findings; 2 medium, 6 low, 5 informational), an audit of CSV exports, and the public repository protections.

- **Security** session hardening ([ADR 0012](docs/decisions/0012-session-hardening.md)): the session cookie is `httpOnly`, `Secure` in production and lasts 12 hours instead of 400 days; Auth ends sessions after 12 hours or 4 hours idle; signing out also ends access for a copied token; the password page only serves the session opened by an invitation, and Auth requires a recent sign-in to change a password.
- **Security** security events (failed and throttled sign-ins, denied access, rejected invitation links) logged as JSON lines without passwords, tokens or emails in clear ([ADR 0013](docs/decisions/0013-security-events-and-export-audit.md)).
- **Security** password-recovery and magic-link emails, which the app does not use, no longer carry a link or token; Auth sends at most one email per address and minute. The security document now covers direct Auth API calls, the local Supabase listening on every interface, and GraphQL on hosted projects.
- **Security** the repository is public with `main` protected (pull requests with the `checks`, `supply-chain` and `integration` jobs passing), GitHub secret scanning with push protection, CodeQL, Dependabot security updates and private vulnerability reporting.
- **Added** an append-only audit of CSV exports: who exported which report, range and rows, recorded before the file is delivered and shown in the history as `REPORTE`.
- **Added** to the README how to open Supabase Studio and connect a PostgreSQL client to the local database.
- **Added** `CLAUDE.md` with the project rules and commands; code comments and test names cite the requirement, rule and decision IDs they implement or cover.
- **Changed** CI to retry starting the local Supabase when the image registry refuses downloads, and the unit-test module loader to allow 10 seconds instead of 2, which failed correct tests on a busy machine.
- **Changed** the integration tests to build their run prefix with `crypto.randomInt` (CodeQL `js/insecure-randomness`).
- **Fixed** the README and the architecture and security documents, which described the session cookie as `httpOnly` before it was.

## [1.0.0] — 2026-10-27

First release: the asset tracking application with its database rules, hardened and prepared so anyone can clone it, start their own local database and evaluate it with demo accounts.

### Reproducible setup, security and quality — 2026-10-27

- **Added** a local Supabase for development and CI (`npm run db:up`, `db:reset`, `env:local`): migrations apply to an empty database, public sign-up is disabled and passwords need 12 characters with letters and digits ([ADR 0007](docs/decisions/0007-local-database-and-terminal-accounts.md)).
- **Added** `npm run create-admin` and `npm run users` to manage accounts from the terminal, through a service-only database function that audits each change and keeps at least one active administrator.
- **Added** `npm run demo:setup`: one account per role with generated passwords shown once, and fictitious departments, employees, assets and movements created through the app's own functions ([ADR 0008](docs/decisions/0008-demo-access.md)).
- **Added** 21 integration tests against a real database for authorization, business rules, concurrency and accounts; unit and source tests reorganized by domain.
- **Added** CI with formatting, lint, types, tests, build, integration tests, dependency audit and secret scanning, plus Dependabot ([ADR 0011](docs/decisions/0011-supply-chain-in-ci.md)).
- **Added** requirements, architecture, ADRs, security and testing documentation, a README in English, an MIT license and a security policy.
- **Security** Next.js 16.4.3, zod 4.6.7 and updated tooling remove every advisory known at the time, including two critical ones in Next.js 16.4.0. A low-severity `deepmerge` advisory published later reaches only the `shadcn` development tool and has no fix yet ([security.md](docs/security.md#known-limitations)).
- **Changed** dependencies after reviewing Dependabot's first proposal: React 19.3.1, supabase-js 2.118.0 (also pinned in the Edge Function), Base UI 1.9, lucide-react, `cn` and the Supabase CLI.
- **Security** HTTP security headers with a Content Security Policy ([ADR 0009](docs/decisions/0009-content-security-policy.md)) and sign-in limits per client IP and per email ([ADR 0010](docs/decisions/0010-sign-in-throttling.md)).
- **Fixed** the initial migration, which failed on an empty database because foreign keys were created before the keys they reference.
- **Changed** the invitation Edge Function to `Deno.serve` with a pinned client version.
- **Removed** unused dependencies and components, the incremental SQL scripts (superseded by the migrations), scripts tied to a single hosted project and internal stage names in user-facing messages.
- **Changed** the codebase to a single Prettier format, LF line endings and no byte-order marks.

### Schema consolidation — 2026-10-13

- **Added** an initial migration rebuilt from the database catalog: 15 tables, 2 enums, 42 functions and 24 triggers, without data or accounts.
- **Added** the README with screenshots of a local installation with fictitious data.

### Users, history, reports and configuration — 2026-10-11 to 2026-10-12

- **Added** the Usuarios screen: account directory, role and status changes with a reason, no self-change and at least one active administrator, all audited.
- **Added** invitations through the `dactivos-invite` Edge Function; invited profiles start inactive and the token is consumed only when the person accepts ([ADR 0006](docs/decisions/0006-invitations-through-an-edge-function.md)).
- **Added** the Historial screen, combining every audit source with role filtering ([ADR 0005](docs/decisions/0005-audit-written-by-the-database.md)).
- **Added** CSV reports for administrators, with protection against spreadsheet formulas and a 10,000-row limit.
- **Added** retirement and reactivation of assets with a reason and an immutable log; the Configuración screen.
- **Changed** the dashboard to real counts and recent movements; unreadable values are shown as unavailable, never as zero.
- **Changed** the visual theme to a dark operations-center style.

### Security review and tests — 2026-10-11

- **Added** automated tests for permissions, RPC parsers, server actions, error handling and form safeguards.
- **Security** reviewed authorization with real sessions for both roles; administrative functions refuse other roles before validating input.

### Core operations — 2026-10-07 to 2026-10-10

- **Added** the Next.js and Supabase application with sign-in and two roles, ADMIN and SECURITY ([ADR 0001](docs/decisions/0001-technology-stack.md)).
- **Added** assets, employees and departments, with all access through role-checking database functions ([ADR 0002](docs/decisions/0002-authorization-in-the-database.md)).
- **Added** deliveries and returns with physical inspection; one open delivery per asset and per employee and category ([ADR 0003](docs/decisions/0003-one-open-delivery.md)).
- **Added** maintenance cases opened by damaged returns, resolution, and release after a physical check ([ADR 0004](docs/decisions/0004-maintenance-and-physical-release.md)).
