# ADR 0008: Demo access with generated passwords and fictitious data

**Status:** Accepted · 2026-10-27

## Context

Someone evaluating the project needs accounts for both roles and enough data to see every screen working: assets in every status, deliveries, returns, a maintenance case, a retirement and their history. Fixed passwords in the documentation would work on any installation that kept them.

## Decision

- **`npm run demo:setup`**, run against the local Supabase:
  - **One account per role** in the reserved `demo.dactivos.test` domain: `admin@demo.dactivos.test` (ADMIN) and `seguridad@demo.dactivos.test` (SECURITY), with **generated passwords** (16 random characters without ambiguous ones, `crypto.randomInt`) printed once and never written to a file. Running it again issues new passwords.
  - **Fictitious data**, created once: 5 departments, 12 employees and 20 assets with `DEMO-` codes; ten deliveries; four returns, two of them damaged; one case resolved and its asset released; one retired asset.
  - The data is created **through the app's own RPCs while signed in as the demo administrator**, so every validation applies and the history shows real audit entries.
- **Safeguards:** it refuses `NODE_ENV=production` and any Supabase URL that is not local; accounts outside the demo domain are never touched; data is not duplicated on later runs.

## Alternatives considered

- **A SQL seed:** it would bypass the functions and the audit trail, and could not create Auth accounts properly.
- **Prompting for passwords:** friction with no benefit on a local database.

## Consequences

- Evaluating the project takes `db:up`, `env:local`, `demo:setup` and `dev`.
- CI runs `demo:setup` on every change, so the demo keeps working as the schema evolves.
