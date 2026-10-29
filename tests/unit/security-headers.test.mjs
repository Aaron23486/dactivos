import test from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy, createNonce } from "../../src/lib/security/csp.ts";

async function headersFor(nodeEnv) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  try {
    const { default: config } = await import(`../../next.config.ts?env=${nodeEnv}`);
    const [rule] = await config.headers();
    return {
      source: rule.source,
      poweredBy: config.poweredByHeader,
      values: Object.fromEntries(rule.headers.map((h) => [h.key, h.value])),
    };
  } finally {
    process.env.NODE_ENV = previous;
  }
}

test("Cabeceras: todas las rutas reciben las protecciones del navegador (NFR-1, D14)", async () => {
  const { source, poweredBy, values } = await headersFor("production");
  assert.equal(source, "/:path*");
  assert.equal(poweredBy, false);
  assert.equal(values["X-Frame-Options"], "DENY");
  assert.equal(values["X-Content-Type-Options"], "nosniff");
  assert.equal(values["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(values["Permissions-Policy"], /camera=\(\)/);
  assert.match(values["Strict-Transport-Security"], /max-age=\d+/);
  // La CSP la envía el proxy con un nonce por solicitud; una CSP fija aquí la anularía.
  assert.equal(values["Content-Security-Policy"], undefined);
});

test("Cabeceras: en desarrollo no se fuerza HTTPS (NFR-1, D14)", async () => {
  const { values } = await headersFor("development");
  assert.equal(values["Strict-Transport-Security"], undefined);
});

test("CSP: los scripts solo corren con el nonce de la solicitud, nunca en línea (NFR-1, D14)", () => {
  const policy = contentSecurityPolicy("abc123", false);
  const directive = (name) =>
    policy
      .split("; ")
      .find((d) => d.startsWith(`${name} `))
      ?.slice(name.length + 1);
  assert.equal(directive("script-src"), "'self' 'nonce-abc123' 'strict-dynamic'");
  assert.equal(directive("style-src"), "'self' 'nonce-abc123'");
  assert.ok(!/'unsafe-inline'|'unsafe-eval'/.test(directive("script-src")));
  for (const [name, value] of [
    ["default-src", "'self'"],
    ["connect-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ]) {
    assert.equal(directive(name), value, name);
  }
  assert.ok(policy.includes("upgrade-insecure-requests"));
});

test("CSP: en desarrollo solo se agrega eval para React y no se fuerza HTTPS (NFR-1, D14)", () => {
  const policy = contentSecurityPolicy("abc123", true);
  assert.match(policy, /script-src 'self' 'nonce-abc123' 'strict-dynamic' 'unsafe-eval'/);
  assert.ok(!policy.includes("upgrade-insecure-requests"));
});

test("CSP: cada solicitud recibe un nonce distinto e impredecible (NFR-1, D14)", () => {
  const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));
  assert.equal(nonces.size, 50);
  for (const nonce of nonces) assert.match(nonce, /^[A-Za-z0-9+/]+=*$/);
});
