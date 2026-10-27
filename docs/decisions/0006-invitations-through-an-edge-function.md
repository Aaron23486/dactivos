# ADR 0006: Invitations through an Edge Function; invited profiles start inactive

**Status:** Accepted · 2026-10-12 (recorded 2026-10-27)

## Context

Creating an account requires the Auth admin API, which needs the service key. That key must never reach the Next.js app, whose environment variables can end up in the browser bundle or in a misconfigured log.

## Decision

- The Usuarios screen calls the **`dactivos-invite` Edge Function** with the administrator's JWT (`verify_jwt` enabled). The function:
  1. verifies the JWT and checks, with the caller's own token, that the caller is an active ADMIN;
  2. asks Auth to send the invitation (`inviteUserByEmail`), using the service key that only exists in the Edge Functions environment;
  3. links an **inactive** profile with the chosen role through `dactivos_admin_link_invited_user`, called with the administrator's JWT, so the audit entry records who invited.
- The invitation email links to `/aceptar-invitacion?token_hash=…`. The page does not consume the token on load; it calls `verifyOtp` only when the person presses **Aceptar invitación**, so link previews and scanners cannot use it up. The person then sets a password and is signed out.
- An administrator activates the account from Usuarios with a reason.

## Alternatives considered

- **Service key in a server action:** one environment variable away from the client bundle.
- **Self-service sign-up with approval:** opens a public sign-up endpoint the app does not need.

## Consequences

- Auth and the database are separate services: if linking the profile fails after the invitation is sent, the identity exists without access and is shown as "Sin perfil válido" in Usuarios until an administrator links it. The function reports `needsReconciliation` and nothing is retried automatically.
- Locally, invitation emails arrive in the Mailpit inbox of the local Supabase.
