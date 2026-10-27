# ADR 0009: Content Security Policy without nonces

**Status:** Accepted · 2026-10-27

## Context

The app had no security headers. The strongest Content Security Policy uses a fresh nonce per request for every script, but Next.js applies nonces only to dynamically rendered pages, and its documentation states that Partial Prerendering is incompatible with nonce-based CSP: the static shell is generated once and cannot carry a per-request nonce. All private pages here use Partial Prerendering (`cacheComponents`).

## Decision

- A CSP on every route, set in `next.config.ts`: `default-src 'self'`, `connect-src 'self'` (the browser only talks to this app), `img-src 'self' blob: data:`, `font-src 'self'` (fonts are self-hosted by `next/font`), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and `upgrade-insecure-requests` outside development.
- `script-src` and `style-src` allow `'unsafe-inline'`; `'unsafe-eval'` only in development.
- Also: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (invitation URLs carry a token), a restrictive `Permissions-Policy`, `Strict-Transport-Security` outside development, and no `X-Powered-By`.

## Alternatives considered

- **Nonces with dynamic rendering everywhere:** would give up Partial Prerendering for every page.
- **Experimental Subresource Integrity:** covers bundled scripts but not the inline scripts Next.js emits for streaming.

## Consequences

- An injected inline script would not be blocked by the CSP; the defenses against injection are React's escaping, server-side validation and the absence of raw HTML rendering.
- External scripts, frames, plugins and cross-origin requests are blocked.
- `tests/unit/security-headers.test.mjs` checks the values for production and development.
