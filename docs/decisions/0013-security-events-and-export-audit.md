# ADR 0013: Security events in the server log and an audit of CSV exports

**Status:** Accepted · 2026-10-28

## Context

The pre-production review found that the app left no trace of failed sign-ins, sign-in throttling, denied access or rejected invitation links, and that CSV exports, which contain the employee directory, were not recorded anywhere. Supabase Auth keeps its own log, but it cannot tell which screen or permission was involved, and it says nothing about exports.

## Decision

- **Security events** (`src/lib/security/events.ts`): one JSON line per event on the server's error output, with `type: "security"`, the event name, the time and a few non-sensitive details:
  - `auth.sign_in_failed` and `auth.sign_in_throttled`, with the client IP and a 16-character SHA-256 fingerprint of the email instead of the email itself;
  - `auth.access_denied`, with the user ID, the permission and the role, from `requirePermission`;
  - `auth.invitation_rejected`, for an invalid or expired invitation link and for a password page opened outside an invitation session;
  - `report.export_blocked`, when an export cannot be recorded.

  Passwords, tokens and full emails are never logged.
- **Export audit** (migration `20261029010000_report_export_log.sql`): `report_export_log` stores who exported which report, the date range and the number of rows. Rows are inserted through `dactivos_admin_log_report_export`, which only an active ADMIN can run, and a trigger rejects any update or delete, even with the service key. The export route records the export **before** returning the file; if recording fails, no file is returned (503).
- The history shows exports to administrators with the source `REPORTE`.

## Alternatives considered

- **Logging sign-in events in the database:** would add a write per failed attempt, which an attacker controls, to the same database the app depends on.
- **Recording exports after sending the file:** a failure would leave an export without a trace.
- **Hashing nothing and logging emails:** easier to read, but the log would become a list of the people who use the system.

## Consequences

- Operators can filter the server log by `"type":"security"` to see attacks on accounts or attempts to reach administrative screens; the log goes wherever the host sends standard error.
- An export that cannot be audited is not delivered.
- The fingerprint identifies the same email across attempts without revealing it; anyone who already knows an email can compute its fingerprint to search for it.
