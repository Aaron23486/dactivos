# Requirements

DACTIVOS tracks the technology assets of an operations center (handheld scanners and computers): which assets exist, who has each one, how they come back and what happens when they come back damaged. This document describes what the system must do. How it is built is in [architecture.md](architecture.md), and each significant decision has an ADR in [decisions/](decisions/README.md).

Requirements have stable identifiers (FR, NFR, R) so that code, tests and decisions can reference them.

## 1. Context and goal

Operations staff use handhelds and computers that are handed out, returned, repaired and eventually retired. Without a system, knowing which device each person has, whether it came back in good condition and whether a repaired device was actually checked before going back into circulation depends on spreadsheets and memory.

**Goal:** know at any moment where each asset is and in which state, and keep an auditable history of every delivery, return, repair and retirement.

The operating cycle of an asset is:

> REGISTER → AVAILABLE → DELIVER → ASSIGNED → RETURN → AVAILABLE
>                                                  ↘ (damaged) MAINTENANCE → RESOLVE → PHYSICAL CHECK → AVAILABLE
>
> AVAILABLE → RETIRE → RETIRED → REACTIVATE → AVAILABLE

## 2. Scope

**In scope:** asset inventory, employees and departments, deliveries and returns with physical inspection, maintenance cases and release after a physical check, retirement and reactivation, an audit history, CSV reports, account administration with two roles.

**Out of scope:**

- Public sign-up or external identity providers (Google, Microsoft…).
- Asset categories other than handheld and computer, and a screen to edit categories.
- Purchasing, depreciation, licenses or spare-parts stock.
- Employees as users: employees receive assets but do not sign in.

## 3. Users and roles

**FR-1 — Roles and access.** There are exactly two roles. The interface hides what a role cannot do, but every rule below is enforced on the server and in the database (R1).

| Capability                                                        | Security | Administrator |
| ----------------------------------------------------------------- | :------: | :-----------: |
| Sign in and see the dashboard                                     |    ✓     |       ✓       |
| Register and edit assets                                          |    ✓     |       ✓       |
| Register and edit employees                                       |    ✓     |       ✓       |
| See departments                                                   |    ✓     |       ✓       |
| Create, rename, activate and deactivate departments               |          |       ✓       |
| Deliver and receive assets                                        |    ✓     |       ✓       |
| Resolve maintenance cases and release repaired assets             |    ✓     |       ✓       |
| See the history of deliveries and maintenance                     |    ✓     |       ✓       |
| See the full history (accounts, catalog changes, retirements)     |          |       ✓       |
| Retire and reactivate assets                                      |          |       ✓       |
| Export CSV reports                                                |          |       ✓       |
| Invite accounts and change role or status                         |          |       ✓       |
| See the configuration screen                                      |          |       ✓       |

- Security is the operational user who hands out and receives equipment.
- There is no public sign-up. Accounts are created by an administrator's invitation (FR-11) or with terminal commands (FR-12).

## 4. Functional requirements

**FR-2 — Asset inventory.** An asset has an internal code, a serial number, a category (`HANDHELD` or `COMPUTER`), a name and an optional description. It is created as **Available**; its status is never chosen by hand. The inventory lists every asset with search by code, serial or name and filters by category and status. The name and description can be edited while the asset is available.

**FR-3 — Asset status.** An asset is in exactly one of four statuses: `AVAILABLE`, `ASSIGNED`, `MAINTENANCE`, `RETIRED`. Status changes only through the operations below; the database rejects any other transition (R5).

**FR-4 — Employees and departments.** An employee has an employee code, a full name and a department, and can be active or inactive. A department has a code and a name and can be active or inactive. New employees go only to active departments.

**FR-5 — Delivery.** An operator delivers an available asset to an active employee by typing or scanning its internal code, serial number or identifier; the server resolves the reference and refuses an unknown or ambiguous one. The delivery requires explicit confirmation and may carry notes. The asset becomes **Assigned**.

**FR-6 — Return with physical inspection.** Receiving an asset records its condition, `GOOD` or `DAMAGED`, and requires confirming that it was physically received. A damaged return needs a description of at least 10 characters. A good return makes the asset **Available**; a damaged return sends it to **Maintenance** and opens a maintenance case automatically.

**FR-7 — Maintenance and release.** A maintenance case is resolved with notes of at least 10 characters. Resolving a case does not release the asset: an operator must then confirm a physical check with notes, and only then the asset becomes **Available** again.

**FR-8 — Retirement and reactivation.** An administrator retires an available asset or reactivates a retired one, with a reason of 10 to 500 characters and explicit confirmation. A retired asset cannot be delivered.

**FR-9 — History.** A paginated history combines deliveries, returns, maintenance, catalog changes, account changes and retirements, with the actor, date and reason where there is one. Security sees deliveries and maintenance of assets that are not retired; administrators see everything.

**FR-10 — Reports.** Administrators export CSV files of assets, employees, deliveries and maintenance cases, optionally filtered by a date range. Files open correctly in Excel (UTF-8 with BOM, `;` separator) and cells cannot run spreadsheet formulas.

**FR-11 — Account invitation and administration.** An administrator invites a person by email with a role and a reason. The person accepts the invitation, sets a password and keeps an **inactive** profile until an administrator activates it. Administrators change the role or status of other accounts with a reason; they cannot change their own account, and the last active administrator cannot be removed.

**FR-12 — Terminal account commands.** For the first administrator and for recovery, accounts can be created, listed, activated, deactivated and have their password reset from the terminal (`npm run create-admin`, `npm run users`). These changes are also recorded in the history.

**FR-13 — Dashboard.** Counts of assets by status, open maintenance cases, assets waiting for release, active employees and the latest movements. A count that could not be read is shown as unavailable, never as zero.

**FR-14 — Demo access.** `npm run demo:setup` creates one account per role with generated passwords shown once and fictitious data that covers the whole cycle, on a local installation only.

## 5. Business rules

- **R1** — Authorization is enforced by the database: tables cannot be read or written directly by app users, and every function checks the caller's role before doing anything.
- **R2** — An asset has at most one open delivery.
- **R3** — An employee has at most one open delivery per category (one handheld and one computer).
- **R4** — Only an available asset can be delivered, and only to an active employee (an active employee always belongs to an active department, see R9).
- **R5** — Status transitions are limited to those of FR-3: deliver (available → assigned), good return (assigned → available), damaged return (assigned → maintenance), release (maintenance → available, after a resolved case and a physical check), retire (available → retired) and reactivate (retired → available).
- **R6** — A damaged return opens exactly one maintenance case, linked to its inspection.
- **R7** — Each physical check releases the asset once.
- **R8** — Internal codes, serial numbers and employee codes are unique regardless of case; department names are unique regardless of case.
- **R9** — An employee with an open delivery cannot be deactivated, and a department with active employees cannot be deactivated.
- **R10** — Reasons for retirement, reactivation, invitations and account changes have 10 to 500 characters without control characters.
- **R11** — Audit records (deliveries, maintenance, catalog changes, account changes, retirements) are written by the database in the same transaction as the change, and the retirement log cannot be modified or deleted.
- **R12** — An administrator cannot change their own account, and there is always at least one active administrator.
- **R13** — A deactivated account loses access on its next request, without waiting for its session to expire.

## 6. Non-functional requirements

- **NFR-1 — Security.** OWASP-aligned controls: server-side authorization, no privileged keys in the web app, generic sign-in errors, sign-in throttling, security headers, secrets only in environment variables. Details in [security.md](security.md).
- **NFR-2 — Consistency under concurrency.** Several operators acting on the same asset at the same moment never produce two open deliveries or duplicated records (R2, R3, R8).
- **NFR-3 — Reproducibility.** Anyone can clone the repository, start their own local database, create demo access and run every test without the author's accounts or a hosted project.
- **NFR-4 — Language.** The interface is in Spanish; code, documentation and repository history are in English.
- **NFR-5 — Accessibility and layout.** Forms have labels, actions require explicit confirmation and are protected against double submission, and screens work on desktop and laptop widths.
