import test from "node:test";
import assert from "node:assert/strict";
import {
  LOGIN_ATTEMPTS_PER_MINUTE,
  LOGIN_LOCKOUT_MINUTES,
  LOGIN_MAX_FAILURES,
  LoginThrottle,
} from "../../src/lib/auth/login-throttle.ts";

function clock(start = 0) {
  let now = start;
  return { now: () => now, advance: (ms) => (now += ms) };
}

test("Login: una IP no puede superar el límite de intentos por minuto (NFR-1, D10)", () => {
  const c = clock();
  const throttle = new LoginThrottle(c.now);
  for (let i = 0; i < LOGIN_ATTEMPTS_PER_MINUTE; i++) {
    assert.equal(throttle.allow("10.0.0.1", `user${i}@example.com`), true);
  }
  assert.equal(throttle.allow("10.0.0.1", "otra@example.com"), false);
  assert.equal(throttle.allow("10.0.0.2", "otra@example.com"), true, "otra IP no se ve afectada");
  c.advance(60_000);
  assert.equal(throttle.allow("10.0.0.1", "otra@example.com"), true, "la ventana se reinicia");
});

test("Login: un correo se bloquea tras fallos consecutivos y se libera al vencer el plazo (NFR-1, D10)", () => {
  const c = clock();
  const throttle = new LoginThrottle(c.now);
  const email = "guarda@example.com";
  for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
    assert.equal(throttle.allow(`10.0.1.${i}`, email), true);
    throttle.recordFailure(email);
  }
  assert.equal(throttle.allow("10.0.2.1", email), false, "bloqueado desde cualquier IP");
  c.advance(LOGIN_LOCKOUT_MINUTES * 60_000);
  assert.equal(throttle.allow("10.0.2.1", email), true);
});

test("Login: un inicio exitoso reinicia el conteo de fallos (NFR-1, D10)", () => {
  const throttle = new LoginThrottle(clock().now);
  const email = "admin@example.com";
  for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) throttle.recordFailure(email);
  throttle.recordSuccess(email);
  throttle.recordFailure(email);
  assert.equal(throttle.allow("10.0.3.1", email), true);
});
