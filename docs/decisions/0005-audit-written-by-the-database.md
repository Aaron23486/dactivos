# ADR 0005: Audit rows written by the database in the same transaction

**Status:** Accepted · 2026-10-11 (recorded 2026-10-27)

## Context

An audit trail written by the web app can be skipped by a bug, or forged by anyone who can call the database directly. It also drifts from reality if the change commits and the audit insert fails.

## Decision

- Triggers write `assignment_audit_log`, `maintenance_audit_log` and `operational_audit_log` (assets, employees, departments, categories) for every insert and update, inside the same transaction.
- Account changes write `admin_audit_log` from the functions that make them, with the actor, the target, the previous and new state, and a mandatory reason.
- Retirements and reactivations write `asset_lifecycle_log` with a reason; a trigger rejects any update or delete on it, even with the service key.
- App users cannot read the audit tables directly; `dactivos_list_audit_events` merges them into one paginated history filtered by role (SECURITY sees deliveries and maintenance of assets that are not retired).

## Alternatives considered

- **Logging from server actions:** depends on every action remembering to do it, and is not atomic with the change.
- **A single generic audit table:** simpler queries, but loses the specific columns each event needs.

## Consequences

- Changes made from the terminal are audited too, with no app actor and an event name that says so ([ADR 0007](0007-local-database-and-terminal-accounts.md)).
- The history screen pages through at most 100 pages of 100 events.
