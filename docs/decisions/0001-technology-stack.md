# ADR 0001: Next.js with Supabase

**Status:** Accepted · 2026-10-07 (recorded 2026-10-27)

## Context

DACTIVOS is an internal web app for a small team: a handful of screens, two roles, and data that must stay consistent when several operators hand out and receive equipment at the same time. I wanted a stack where the important rules could live in the database, authentication would not be written from scratch, and the whole thing could run on one machine for development.

## Decision

- **Next.js 16 (App Router) with React 19 and TypeScript.** Server Components render the screens on the server; Server Actions handle forms without a separate API layer.
- **Supabase** for Auth (email and password, invitations, sessions in cookies), PostgreSQL 17 and PostgREST, plus one Edge Function for invitations.
- **Business rules in PostgreSQL**: functions, constraints and triggers ([ADR 0002](0002-authorization-in-the-database.md), [ADR 0003](0003-one-open-delivery.md)).
- Tailwind CSS 4 and a few Base UI primitives for the interface; Zod for input validation.

## Alternatives considered

- **A separate API (for example NestJS) with its own authentication:** more code to secure and maintain for an app of this size, and the rules would still need database constraints to survive concurrency.
- **An ORM with all rules in application code:** concurrent deliveries could slip between a check and an insert unless every rule were duplicated as a constraint.

## Consequences

- Most logic is SQL: it is tested with integration tests against a real database ([testing.md](../testing.md)).
- Supabase services run locally with the Supabase CLI and Docker ([ADR 0007](0007-local-database-and-terminal-accounts.md)).
- A hosted deployment needs a Supabase project in addition to the Next.js host.
