# ADR 0010: Sign-in throttling per client IP and per email

**Status:** Accepted · 2026-10-27

## Context

Supabase Auth limits sign-ins per IP address, but every sign-in reaches it from the Next.js server, so that limit is shared by all users: it neither slows down one attacker nor protects one account, and a burst of failures can lock everyone out.

## Decision

- `src/lib/auth/login-throttle.ts`, used by the sign-in action:
  - at most **10 attempts per minute per client IP** (first address of `X-Forwarded-For`, or a single bucket without a proxy);
  - after **5 consecutive failures** an email is **locked for 15 minutes**, from any IP; a successful sign-in resets the count.
- Both limits answer with the same message whether or not the account exists, so they do not reveal registered emails.
- State lives in the server's memory, bounded to 10,000 entries per map.

## Alternatives considered

- **Relying only on Supabase's limit:** see the context.
- **A shared store (Redis):** needed for several instances, unnecessary for one.

## Consequences

- The limits reset when the server restarts and are counted separately by each instance.
- Behind a proxy that does not set `X-Forwarded-For`, all clients share one IP bucket; without a proxy the header can be forged, so the per-email lock is the control that always holds.
- Someone who knows an email can lock it for 15 minutes on purpose; the lock expires on its own.
- The limits apply to the app's sign-in form. A client that calls the Supabase Auth API directly faces only Supabase's own per-IP limit. The publishable key it would need is not sent to the browser, but it is not a secret either; on a hosted project, Auth's CAPTCHA protection is the control for that path.
