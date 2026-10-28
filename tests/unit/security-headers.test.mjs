import test from "node:test";
import assert from "node:assert/strict";

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

test("Cabeceras: todas las rutas reciben CSP y protecciones del navegador (NFR-1, D9)", async () => {
  const { source, poweredBy, values } = await headersFor("production");
  assert.equal(source, "/:path*");
  assert.equal(poweredBy, false);
  const csp = values["Content-Security-Policy"];
  for (const directive of [
    "default-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]) {
    assert.ok(csp.includes(directive), directive);
  }
  assert.ok(!csp.includes("unsafe-eval"), "producción no permite eval");
  assert.equal(values["X-Frame-Options"], "DENY");
  assert.equal(values["X-Content-Type-Options"], "nosniff");
  assert.equal(values["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(values["Permissions-Policy"], /camera=\(\)/);
  assert.match(values["Strict-Transport-Security"], /max-age=\d+/);
});

test("Cabeceras: en desarrollo no se fuerza HTTPS (NFR-1, D9)", async () => {
  const { values } = await headersFor("development");
  assert.equal(values["Strict-Transport-Security"], undefined);
  assert.ok(!values["Content-Security-Policy"].includes("upgrade-insecure-requests"));
});
