# ADR 0012: Session hardening

**Status:** Accepted · 2026-10-28

## Context

The pre-production security review found that the session was the weakest point of an otherwise database-enforced design:

- `@supabase/ssr` stores the session (access and **refresh** token) in a cookie that JavaScript can read, without `Secure`, for 400 days. Any injected script could take the refresh token and keep the account indefinitely; the Content Security Policy allows inline scripts ([ADR 0009](0009-content-security-policy.md)).
- The page for an invited person to create a password accepted any signed-in session, so a copied session could replace the password without knowing the current one; Supabase Auth also allowed it without reauthentication.
- Signing out revoked the Auth session, but a copied access token kept working against the database functions until it expired, because PostgREST checks only the signature and expiry.
- Sessions had no maximum length or inactivity limit.

## Decision

- **Cookie:** every session cookie written by the server and the proxy is `httpOnly`, `Secure` in production and `SameSite=Lax`, and lives 12 hours (`src/lib/supabase/cookie-options.ts`). The browser never needs it: it never calls Supabase.
- **Sessions:** Auth ends a session after 12 hours (one shift) or 4 hours without use (`[auth.sessions]` in `supabase/config.toml`).
- **Live session in the role check:** `current_app_role()` grants the role only while the token's Auth session exists and has not reached its end (`auth.sessions`, migration `20261029000000_role_requires_live_session.sql`). Every function checks the role through it, so signing out ends access to the API at once (R13).
- **Password creation only right after an invitation:** `/establecer-contrasena` and its action require a session whose `amr` claim shows an `otp` verification from the last 15 minutes — the session the invitation link opens (`src/lib/auth/invitation-session.ts`). A session started with a password is sent away. Auth requires a recent sign-in or reauthentication to change a password (`secure_password_change`).
- **Recovery:** the app offers no password reset by email; an administrator resets passwords with `npm run users -- reset-password` ([ADR 0007](0007-local-database-and-terminal-accounts.md)). Supabase Auth still answers recovery and magic-link requests, so their email templates carry no link or token, and Auth sends at most one email per address and minute.

## Alternatives considered

- **Nonce-based CSP to make cookie theft harder:** incompatible with Partial Prerendering at the time (ADR 0009; later adopted in ADR 0014); making the cookie unreadable removes the reason to steal it from scripts.
- **Shorter access tokens instead of the live-session check:** narrows the window but does not close it, and increases token refreshes.
- **Asking for the current password on `/establecer-contrasena`:** an invited person has none; limiting the page to the invitation session fits its purpose.

## Consequences

- A stolen cookie can no longer be read by page scripts; a copied access token stops working as soon as the session is signed out or expires.
- Each role check reads one row of `auth.sessions` by primary key.
- An invited person has 15 minutes after accepting to create the password; after that they need a new invitation.
- On a hosted Supabase project, session time limits depend on the plan; the deployment checklist in [security.md](../security.md) says so.
