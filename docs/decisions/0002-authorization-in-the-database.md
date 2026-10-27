# ADR 0002: Tables closed to app users; everything through role-checking functions

**Status:** Accepted · 2026-10-09 (recorded 2026-10-27)

## Context

With Supabase, the browser could talk to the database directly, and authorization would then depend on row-level security policies for every table and operation. A forgotten policy, or a check that only exists in the web app, would expose data or allow an operation the role should not perform.

## Decision

- **RLS is enabled on all 15 tables, with no policies, and every table privilege is revoked** from `anon` and `authenticated`. App users cannot read or write any table directly.
- All reads and writes go through **`SECURITY DEFINER` functions** with `search_path = ''`. Each one first gets the caller with `auth.uid()` and the role with `current_app_role()` (which returns `NULL` for an inactive or missing profile), and raises `42501` if the role is not allowed. Only then does it validate input and apply the business rules.
- `EXECUTE` is revoked from `PUBLIC` and `anon` on every function and granted to `authenticated` only where the app needs it; trigger functions are not callable at all.
- The web app checks permissions too (`requirePermission`), to hide what a role cannot do and to fail before calling the database, but it never relies on that check alone.
- The browser never receives a Supabase client: pages and actions run on the server with the user's session.

## Alternatives considered

- **RLS policies per table and operation:** many policies to keep in sync with the business rules, and multi-table operations (a delivery touches assets, assignments and audit) would still need functions.
- **Authorization only in the Next.js server:** a leaked public key plus a session token would be enough to bypass it.

## Consequences

- Adding a feature means adding or changing a function, with its role check and grant, in a migration.
- The integration tests check every table and administrative function against anonymous visitors, accounts without an active profile, SECURITY and ADMIN ([testing.md](../testing.md)).
- Lists return at most 500 rows from each function; the screens say so when a list may be partial.
