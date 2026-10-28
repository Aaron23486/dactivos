# Testing

How DACTIVOS is tested, how to run each level, and which tests cover each rule.

## Levels

| Level       | Command                    | Count | What it checks                                                                                                     |
| ----------- | -------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------ |
| Unit        | `npm test`                 |    68 | RPC result parsers, permissions, server actions with a mocked Supabase client, error mapping, dashboard summary, CSV, sign-in throttling, security headers |
| Source      | `npm test`                 |    49 | Checks over the source code: request-time rendering boundaries, forbidden patterns (direct table access, privileged keys), form safeguards |
| Integration | `npm run test:integration` |    24 | Authorization, business rules, concurrency and accounts against the local Supabase, through Auth, PostgREST and the database functions |
| End-to-end  | `npm run test:e2e`         |    13 | Playwright on a production build: access and roles, the asset cycle from the screens, the full invitation through Mailpit, and WCAG 2.1 A/AA checks with axe on every main screen, a dialog, keyboard-only sign-in and tablet width |

Unit, source and integration tests use Node's built-in runner (`node:test`); end-to-end tests use Playwright. Unit and source tests need nothing running. Integration tests need the local Supabase (`npm run db:up`); each run creates its own accounts and records with a unique `T…` prefix and never changes the demo data. `npm run db:reset` returns the local database to an empty state. End-to-end tests build the app, start it on port 3100 against the same local Supabase and create their own accounts and records with an `E2E…` prefix; `E2E_BROWSER_CHANNEL=msedge` (or `chrome`) uses an installed browser instead of downloading Playwright's Chromium.

**Coverage:** `npm run test:coverage` runs the unit and source tests with Node's coverage and fails below 85 % of lines, branches or functions (at the time of writing: 87.6 % lines, 93.2 % branches, 91.0 % functions). It measures the modules those tests load; database functions and pages are covered by the integration and end-to-end tests instead.

Every test name ends with the requirement, rule or decision IDs it covers, for example `(FR-5, R2)`, and the code comments of each operation cite the same IDs, so a rule can be followed from the requirements to the code and its tests.

Static checks: `npm run format:check`, `npm run lint`, `npm run typecheck`. `npm run check` runs formatting, types, lint, unit and source tests and the build in sequence.

CI runs every level on each pull request ([ADR 0011](decisions/0011-supply-chain-in-ci.md)): `checks` (static checks, unit and source tests with coverage thresholds, build), `integration` (migrations on an empty database, `demo:setup`, integration and end-to-end tests) and `supply-chain` (dependency audit and secret scan).

## Coverage by requirement and rule

| Requirement or rule                                  | Tests                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| FR-1 roles and permissions                           | `unit/permissions`, `integration/authorization` (every table and administrative function per role), `e2e/1-access` (navigation and denied screens per role) |
| R1 authorization in the database                     | `integration/authorization`; `source/security-structure` (no direct table access in the app)                       |
| FR-5, R2 one open delivery per asset                 | `integration/business-rules` (second delivery refused), `integration/concurrency` (4 simultaneous deliveries, 1 winner) |
| R3 one open delivery per employee and category       | `integration/business-rules`                                                                                       |
| FR-5 server-side resolution of the scanned reference | `unit/operation-actions` (code to ID on the server, ambiguous reference refused)                                   |
| FR-6, FR-7, R5–R7 returns, maintenance and release   | `integration/business-rules` (damaged return → maintenance, release refused before resolution, full path), `e2e/2-asset-cycle` (the same path from the screens) |
| FR-8 retirement and reactivation                     | `integration/business-rules` (only when available, retired asset cannot be delivered, reactivation)               |
| R8 unique codes                                      | `integration/business-rules` (case-insensitive duplicate), `integration/concurrency` (simultaneous creation)       |
| R10 input validation                                 | `unit/operation-actions`, `unit/department-actions`, `integration/business-rules`, `integration/accounts`          |
| R11 audit written by the database, immutable log     | `integration/business-rules` (lifecycle log update and delete refused), `integration/accounts` (audit entries)    |
| FR-9 history filtered by role                        | `integration/authorization`, `source/history-rendering`                                                            |
| FR-10 CSV reports                                    | `unit/csv`, `source/routes-and-exports`, `integration/authorization` (report refused to SECURITY), `integration/report-exports` (every export audited), `source/security-events` |
| NFR-1 security events                                | `unit/security-events`, `source/security-events`                                                                   |
| FR-11, R12, R13 invitations and account changes      | `integration/accounts` (including a copied token after sign-out), `source/user-access`, `source/invitation-onboarding`, `unit/users-directory`, `unit/session-hardening`, `e2e/3-invitation` (invite, accept from the email, create the password, enable, sign in), `e2e/1-access` (httpOnly cookie, sign-out) |
| FR-12 terminal commands                              | `integration/accounts` (terminal function), `integration/authorization` (closed to app users)                     |
| FR-13 dashboard                                      | `unit/dashboard-summary` (unreadable counts never shown as zero, partial lists flagged)                            |
| FR-14 demo access                                    | CI runs `npm run demo:setup` on an empty database                                                                  |
| NFR-1 sign-in throttling and headers                 | `unit/login-throttle`, `unit/security-headers`                                                                     |
| Error messages without SQL details                   | `unit/operation-errors`, `source/user-access`                                                                      |
| NFR-5 accessibility and layout                       | `e2e/4-accessibility` (axe WCAG 2.1 A/AA on 10 screens and a dialog, keyboard-only sign-in, no horizontal overflow at tablet width), `source/form-behavior` |

## Not covered by automated tests

- **Screen reader output** is not checked automatically; axe verifies names, roles, contrast and structure, not how a given reader announces them.
- **The last-active-administrator rule** was verified by hand with the terminal command; it is not in the integration suite because the shared local database always has other administrators.
