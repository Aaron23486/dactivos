# Testing

How DACTIVOS is tested, how to run each level, and which tests cover each rule.

## Levels

| Level       | Command                    | Count | What it checks                                                                                                     |
| ----------- | -------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------ |
| Unit        | `npm test`                 |    68 | RPC result parsers, permissions, server actions with a mocked Supabase client, error mapping, dashboard summary, CSV, sign-in throttling, security headers |
| Source      | `npm test`                 |    48 | Checks over the source code: request-time rendering boundaries, forbidden patterns (direct table access, privileged keys), form safeguards |
| Integration | `npm run test:integration` |    24 | Authorization, business rules, concurrency and accounts against the local Supabase, through Auth, PostgREST and the database functions |

All tests use Node's built-in runner (`node:test`). Unit and source tests need nothing running. Integration tests need the local Supabase (`npm run db:up`); each run creates its own accounts and records with a unique `T…` prefix and never changes the demo data. `npm run db:reset` returns the local database to an empty state.

Every test name ends with the requirement, rule or decision IDs it covers, for example `(FR-5, R2)`, and the code comments of each operation cite the same IDs, so a rule can be followed from the requirements to the code and its tests.

Static checks: `npm run format:check`, `npm run lint`, `npm run typecheck`. `npm run check` runs formatting, types, lint, unit and source tests and the build in sequence.

CI runs every level on each pull request ([ADR 0011](decisions/0011-supply-chain-in-ci.md)): `checks` (static checks, unit and source tests, build), `integration` (migrations on an empty database, `demo:setup`, integration tests) and `supply-chain` (dependency audit and secret scan).

## Coverage by requirement and rule

| Requirement or rule                                  | Tests                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| FR-1 roles and permissions                           | `unit/permissions`, `integration/authorization` (every table and administrative function per role)                |
| R1 authorization in the database                     | `integration/authorization`; `source/security-structure` (no direct table access in the app)                       |
| FR-5, R2 one open delivery per asset                 | `integration/business-rules` (second delivery refused), `integration/concurrency` (4 simultaneous deliveries, 1 winner) |
| R3 one open delivery per employee and category       | `integration/business-rules`                                                                                       |
| FR-5 server-side resolution of the scanned reference | `unit/operation-actions` (code to ID on the server, ambiguous reference refused)                                   |
| FR-6, FR-7, R5–R7 returns, maintenance and release   | `integration/business-rules` (damaged return → maintenance, release refused before resolution, full path)           |
| FR-8 retirement and reactivation                     | `integration/business-rules` (only when available, retired asset cannot be delivered, reactivation)               |
| R8 unique codes                                      | `integration/business-rules` (case-insensitive duplicate), `integration/concurrency` (simultaneous creation)       |
| R10 input validation                                 | `unit/operation-actions`, `unit/department-actions`, `integration/business-rules`, `integration/accounts`          |
| R11 audit written by the database, immutable log     | `integration/business-rules` (lifecycle log update and delete refused), `integration/accounts` (audit entries)    |
| FR-9 history filtered by role                        | `integration/authorization`, `source/history-rendering`                                                            |
| FR-10 CSV reports                                    | `unit/csv`, `source/routes-and-exports`, `integration/authorization` (report refused to SECURITY), `integration/report-exports` (every export audited), `source/security-events` |
| NFR-1 security events                                | `unit/security-events`, `source/security-events`                                                                   |
| FR-11, R12, R13 invitations and account changes      | `integration/accounts` (including a copied token after sign-out), `source/user-access`, `source/invitation-onboarding`, `unit/users-directory`, `unit/session-hardening` |
| FR-12 terminal commands                              | `integration/accounts` (terminal function), `integration/authorization` (closed to app users)                     |
| FR-13 dashboard                                      | `unit/dashboard-summary` (unreadable counts never shown as zero, partial lists flagged)                            |
| FR-14 demo access                                    | CI runs `npm run demo:setup` on an empty database                                                                  |
| NFR-1 sign-in throttling and headers                 | `unit/login-throttle`, `unit/security-headers`                                                                     |
| Error messages without SQL details                   | `unit/operation-errors`, `source/user-access`                                                                      |

## Not covered by automated tests

- **End-to-end browser tests.** The screens were checked by hand in the browser with the demo accounts (sign-in, dashboard, inventory, users, history, the full invitation flow through Mailpit); there is no Playwright suite yet.
- **The invitation Edge Function** is exercised by hand on the local Supabase; the integration job leaves the Edge runtime out to start faster.
- **The last-active-administrator rule** was verified by hand with the terminal command; it is not in the integration suite because the shared local database always has other administrators.
