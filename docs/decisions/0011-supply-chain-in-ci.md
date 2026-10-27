# ADR 0011: Dependency audit, secret scanning and reviewed Dependabot updates

**Status:** Accepted · 2026-10-27

## Context

The project shipped with a Next.js version affected by two critical advisories, and every check ran only on the developer's machine. Vulnerable dependencies, a leaked key or a migration that no longer applies should be caught on every change, before merging.

## Decision

- **CI on every pull request and on `main`** (`.github/workflows/ci.yml`), with read-only permissions and actions pinned by commit:
  - `checks`: install with `npm ci`, formatting, lint, type check, unit and source tests, build;
  - `supply-chain`: `npm audit --audit-level=high` and gitleaks over the full Git history;
  - `integration`: local Supabase, migrations on an empty database, `demo:setup` and the integration tests.
- **Dependabot** weekly for npm and GitHub Actions. Minor and patch versions arrive grouped; majors of Next.js and eslint-config-next, React, TypeScript, ESLint and the Node types are ignored, because each has to move together with the rest of the toolchain as a planned change.
- No update is merged automatically: each pull request runs the full CI and is reviewed.

## Alternatives considered

- **Automatic merging of green updates:** a passing build does not prove a framework upgrade is safe.
- **Scanning only the latest commit for secrets:** a key removed from the code would still be in the history.

## Consequences

- The integration job downloads the Supabase images on every run (a few minutes).
- Framework upgrades are deliberate changes with their own pull request.
