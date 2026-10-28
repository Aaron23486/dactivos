# Security

Security measures in DACTIVOS, the tests that back them, known limitations and what to check before deploying. To report a vulnerability, see [SECURITY.md](../SECURITY.md).

The review behind this document used OWASP Top 10:2025, OWASP API Security Top 10:2023 and OWASP ASVS 5.0 (level 2) as references. That does not make the app certified or free of vulnerabilities.

## Measures

| Area                     | Measure                                                                                                                                                      | Verified by                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Access control           | All tables closed to app users (RLS on, privileges revoked); every function checks the role first; `EXECUTE` only where needed ([ADR 0002](decisions/0002-authorization-in-the-database.md)) | `tests/integration/authorization.test.ts`                      |
| Access control           | The web app checks permissions on every page, action and route with `requirePermission`, in addition to the database                                         | `tests/source/security-structure.test.mjs`, `tests/unit/operation-actions.test.mjs` |
| Access control           | Deactivating an account or signing out cuts its access on the next request, also for a copied token: the role check requires a live Auth session; no self-change; at least one active ADMIN ([ADR 0012](decisions/0012-session-hardening.md)) | `tests/integration/accounts.test.ts`                           |
| Privileged keys          | No service key in the web app or the browser; only in the Edge Function environment and terminal commands; the terminal function is executable only by `service_role` | `tests/source/security-structure.test.mjs`, `tests/integration/authorization.test.ts` |
| Authentication           | Session cookie `httpOnly`, `Secure` in production, `SameSite=Lax`, 12 hours; Auth ends sessions after 12 hours or 4 hours idle; identity read with `getUser()`/`getClaims()`, never trusted from the cookie alone; no public sign-up ([ADR 0012](decisions/0012-session-hardening.md)) | `tests/unit/session-hardening.test.mjs`, `tests/source/security-structure.test.mjs` |
| Authentication           | A password can only be created by the session an invitation link opened in the last 15 minutes; Auth requires a recent sign-in to change a password; resets are done by an administrator from the terminal | `tests/unit/session-hardening.test.mjs`, `tests/source/invitation-onboarding.test.mjs` |
| Authentication           | Passwords of 12–72 characters with letters and digits, in the app and in Auth                                                                                | `supabase/config.toml`, `src/lib/auth/password-policy.ts`      |
| Authentication           | Generic sign-in errors; 10 attempts per minute per IP and a 15-minute lock per email after 5 failures ([ADR 0010](decisions/0010-sign-in-throttling.md))      | `tests/unit/login-throttle.test.mjs`                           |
| Invitations              | Token consumed only when the person presses the button; invited profiles start inactive ([ADR 0006](decisions/0006-invitations-through-an-edge-function.md)) | `tests/source/invitation-onboarding.test.mjs`, `tests/integration/accounts.test.ts` |
| Unused Auth flows        | Password-recovery and magic-link emails carry no link or token (passwords are reset by an administrator); at most one email per address and minute | `tests/source/invitation-onboarding.test.mjs`                  |
| Input validation         | Zod on every server action; the database validates lengths, formats, categories and reasons again                                                            | `tests/unit/operation-actions.test.mjs`, `tests/integration/business-rules.test.ts` |
| Injection                | Parameterized RPC calls only; functions run with `search_path = ''`; no dynamic SQL from user input                                                          | Code review                                                    |
| Integrity                | Partial unique indexes, row locks and triggers keep deliveries, maintenance and releases consistent under concurrency                                         | `tests/integration/concurrency.test.ts`, `tests/integration/business-rules.test.ts` |
| Audit                    | History written by the database in the same transaction; retirement log immutable even for the service key                                                   | `tests/integration/business-rules.test.ts`                     |
| Audit                    | Every CSV export recorded (actor, report, range, rows) in an append-only log before the file is returned; no record, no file ([ADR 0013](decisions/0013-security-events-and-export-audit.md)) | `tests/integration/report-exports.test.ts`, `tests/source/security-events.test.mjs` |
| Logging                  | Failed and throttled sign-ins, denied access and rejected invitation links logged as JSON lines with `type: "security"`; emails as a SHA-256 fingerprint, never passwords or tokens | `tests/unit/security-events.test.mjs`, `tests/source/security-events.test.mjs` |
| Error handling           | Errors mapped to Spanish messages by SQLSTATE; SQL text and stack traces never reach the browser                                                             | `tests/unit/operation-errors.test.mjs`, `tests/source/user-access.test.mjs` |
| CSV export               | Cells starting with `=`, `+`, `-` or `@` are neutralized; ADMIN only; at most 10,000 rows, never a partial file                                               | `tests/unit/csv.test.mjs`, `tests/source/routes-and-exports.test.mjs` |
| Browser                  | CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS outside development, no `X-Powered-By` ([ADR 0009](decisions/0009-content-security-policy.md)) | `tests/unit/security-headers.test.mjs`                         |
| Secrets                  | `.env*` ignored except `.env.example`; only public values in `.env.local`; gitleaks over the full history in CI                                              | CI `supply-chain` job                                          |
| Dependencies             | `npm audit` (high and critical) in CI; Dependabot proposes updates for review ([ADR 0011](decisions/0011-supply-chain-in-ci.md))                              | CI `supply-chain` job                                          |
| Repository               | `main` accepts changes only through pull requests with the `checks`, `supply-chain` and `integration` jobs passing, for administrators too; no force pushes or deletion. GitHub secret scanning with push protection, CodeQL code scanning, Dependabot security updates and private vulnerability reporting are enabled | GitHub repository settings                                     |

## Known limitations

- **The CSP allows inline scripts** because Partial Prerendering cannot carry a per-request nonce ([ADR 0009](decisions/0009-content-security-policy.md)). React's escaping and the absence of raw HTML rendering are the defenses against injected markup.
- **Sign-in limits live in each server instance's memory** and reset on restart. The per-IP limit trusts `X-Forwarded-For`, which a client can forge when there is no proxy in front; the per-email lock always applies. Someone who knows an email can lock it for 15 minutes on purpose.
- **Supabase's own reauthentication rule counts any sign-in from the last 24 hours as recent,** so a freshly copied session could still change the password directly through the Auth API. The app's own password page does not allow it, and the cookie can no longer be read by page scripts ([ADR 0012](decisions/0012-session-hardening.md)).
- **Changing a password from the terminal does not end the account's open sessions.** Deactivate the account first if a session may be compromised.
- **Invitations are not atomic:** if linking the profile fails after Auth sends the email, the identity exists without access until an administrator reviews it ([ADR 0006](decisions/0006-invitations-through-an-edge-function.md)).
- **The sign-in limits cover the app's form, not direct calls to the Supabase Auth API,** which only Supabase's own per-IP limit protects. The publishable key such a call needs is not sent to the browser ([ADR 0010](decisions/0010-sign-in-throttling.md)).
- **The local Supabase listens on every network interface** with development credentials (`postgres`/`postgres`, Studio without sign-in, Mailpit with invitation links). It is meant for one developer machine on a trusted network; stop it with `npm run db:down`.
- **Signed-in users can list the names of the database functions** through PostgREST's OpenAPI description, and direct API callers receive PostgreSQL validation messages (for example an invalid UUID). Neither exposes data; the app itself maps errors to its own messages.
- **Lists show at most 500 rows** per screen; the screens say so when a list may be partial.
- **CSV exports are not a snapshot:** rows changed while the export pages through may appear in their new state.
- **One low-severity advisory without a fix** (GHSA-gcqx-w48m-w2h4, prototype poisoning in `deepmerge`, every version from 4.2.0) reaches the project through the `shadcn` development tool. The app only imports a stylesheet from that package; the vulnerable code belongs to its command-line tool, which is not part of the app and never receives untrusted input. CI fails only on high or critical advisories, and Dependabot will propose the fix when one is published.

## Before deploying to a hosted Supabase project

1. Apply the migrations to the new project (`supabase link` and `supabase db push`); never run them on a database that already has the schema.
2. In Authentication settings: disable sign-up, set the minimum password length to 12 with letters and digits, set the Site URL to the app's HTTPS address and allow only `<site>/aceptar-invitacion` as a redirect URL.
3. Use the invitation template in `supabase/templates/invite.html` and a real SMTP provider.
4. Deploy the Edge Function with JWT verification: `supabase functions deploy dactivos-invite` (never `--no-verify-jwt`).
5. Create the first administrator from a terminal with `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` set only for that command: `npm run create-admin`.
6. In the Next.js host, set only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, serve over HTTPS, and make sure the proxy sets `X-Forwarded-For`.
7. Never run `demo:setup` against the hosted project (it refuses a non-local URL).
8. Disable the `pg_graphql` extension if nothing uses GraphQL; the tables are closed anyway, but an unused API should not be exposed.
9. Use the recovery and magic-link templates in `supabase/templates/`, which carry no link, and consider Auth's CAPTCHA protection for direct sign-in attempts.
10. Turn on secure password change, and set the session time-box (12 hours) and inactivity timeout (4 hours) in Authentication → Sessions; on some Supabase plans these limits are not available, in which case the 12-hour cookie is the only limit.
