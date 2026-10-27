# ADR 0007: Local Supabase for development and CI; accounts from the terminal

**Status:** Accepted · 2026-10-27

## Context

The app was developed against a single hosted Supabase project. Running it elsewhere meant creating a project, pasting SQL scripts in an order nobody had verified, and inserting the first administrator by hand with a UUID. The reconstructed initial migration had never been applied to an empty database, and in fact failed at its first foreign key.

## Decision

- **Local Supabase with the Supabase CLI** (`supabase/config.toml`, Docker): `npm run db:up` starts Auth, PostgREST, PostgreSQL, the Edge runtime, Studio and Mailpit, and applies the migrations to an empty database. The configuration disables public sign-up, requires passwords of 12 or more characters with letters and digits, uses the invitation template, and leaves out services the app does not use.
- `npm run env:local` writes `.env.local` with the local URL and **publishable** key read from the Supabase CLI. Secret keys are never written to a file.
- The initial migration's constraints are reordered so keys exist before the foreign keys that reference them.
- **Terminal commands** for the first administrator and for recovery: `npm run create-admin` and `npm run users -- list | create | activate | deactivate | reset-password`. They run with the local service key and call **`dactivos_terminal_set_access`**, a function only `service_role` can execute. It changes the profile and writes `admin_audit_log` (no app actor, `TERMINAL_…` event) in one transaction, and refuses to remove the last active administrator.
- For a hosted project, the same commands accept `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` from the terminal's environment; they are never read from `.env.local`.

## Alternatives considered

- **Documenting a hosted project setup only:** every evaluator would need an account and a manual setup, and CI could not test the migrations.
- **Inserting profiles with SQL by hand:** no audit entry and easy to get wrong.

## Consequences

- Development and evaluation need Docker.
- CI starts the same local Supabase, applies the migrations, runs `demo:setup` and the integration tests ([ADR 0011](0011-supply-chain-in-ci.md)).
