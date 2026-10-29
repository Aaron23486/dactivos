# ADR 0014: Content Security Policy with a per-request nonce

**Status:** Accepted · 2026-10-29 · Supersedes [ADR 0009](0009-content-security-policy.md)

## Context

[ADR 0009](0009-content-security-policy.md) allowed inline scripts in the Content Security Policy because the app used Partial Prerendering (`cacheComponents`). A prerendered static shell is generated once, so it cannot carry the nonce of each request. That left the CSP unable to stop an injected inline script, the main thing a CSP is for.

Every private page of this app depends on the signed-in user and already rendered its content per request, so the static shell saved little. Security comes first.

## Decision

- **Partial Prerendering is off:** `cacheComponents` and `partialPrefetching` are removed from `next.config.ts`. The root layout calls `connection()`, so every page, including the error and 404 pages, is rendered per request.
- **The proxy sets the policy:** `src/proxy.ts` creates a random nonce for each request (`src/lib/security/csp.ts`). It passes the policy and the nonce to Next.js in the request headers, which adds the nonce to its own scripts, and sends the same policy to the browser:
  - `script-src 'self' 'nonce-…' 'strict-dynamic'`: only scripts carrying this response's nonce run, plus the chunks they load. `'unsafe-eval'` is added in development only, which React needs to rebuild server errors.
  - `style-src 'self' 'nonce-…'` for style elements. `style-src-attr 'unsafe-inline'` allows inline `style` attributes, which the progress bars and dialog positioning use and which cannot run code.
  - `default-src`, `connect-src`, `base-uri` and `form-action` are `'self'`; `object-src` and `frame-ancestors` are `'none'`; `upgrade-insecure-requests` outside development.
- The other headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS) stay in `next.config.ts`; a fixed CSP there would conflict with the proxy's.

## Alternatives considered

- **Keep ADR 0009:** faster first paint for the static shell, but an injected inline script would run.
- **Hashes instead of a nonce:** the scripts that stream each page's data change on every request, so they cannot be hashed in advance.
- **Experimental Subresource Integrity:** covers bundled files, not the inline scripts Next.js emits.

## Consequences

- An injected inline script or event handler does not run. The browser tests check this with an `onerror` handler written into the page, and also check that every server-sent script carries the response's nonce, that the nonce changes on every response, and that the main screens produce no CSP violations.
- Pages are no longer served from a prerendered shell. For this app every page already waited for the session, so the difference is small.
- **Next.js 17:** the Next.js 16 documentation announces that Cache Components and Partial Prefetching will be enabled everywhere in the next major version and their options removed. Upgrading will require revisiting this decision. Either Next.js offers a way to combine both, or the trade-off of ADR 0009 has to be accepted again, and recorded in a new ADR.
