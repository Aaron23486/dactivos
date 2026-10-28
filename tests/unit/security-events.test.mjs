import test from "node:test";
import assert from "node:assert/strict";
import { emailFingerprint, logSecurityEvent } from "../../src/lib/security/events.ts";

test("Eventos: el correo se registra como huella estable, nunca en claro (NFR-1, D13)", () => {
  const a = emailFingerprint("Guarda@Ejemplo.test ");
  assert.equal(a, emailFingerprint("guarda@ejemplo.test"), "no depende de mayúsculas ni espacios");
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.notEqual(a, emailFingerprint("otra@ejemplo.test"));
  assert.ok(!a.includes("guarda"));
});

test("Eventos: una línea JSON con tipo, evento y hora (NFR-1, D13)", () => {
  const lines = [];
  const original = console.warn;
  console.warn = (line) => lines.push(line);
  try {
    logSecurityEvent("auth.sign_in_failed", {
      email: emailFingerprint("x@y.test"),
      ip: "10.0.0.1",
    });
  } finally {
    console.warn = original;
  }
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.type, "security");
  assert.equal(entry.event, "auth.sign_in_failed");
  assert.ok(Number.isFinite(Date.parse(entry.at)));
  assert.equal(entry.ip, "10.0.0.1");
  assert.ok(!lines[0].includes("x@y.test"));
});
