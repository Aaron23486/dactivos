import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  hardenSessionCookie,
} from "../../src/lib/supabase/cookie-options.ts";
import {
  INVITATION_PASSWORD_WINDOW_SECONDS,
  isFreshInvitationSession,
} from "../../src/lib/auth/invitation-session.ts";

function withNodeEnv(value, fn) {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    return fn();
  } finally {
    process.env.NODE_ENV = previous;
  }
}

test("Sesión: la cookie no es legible por JavaScript y dura un turno, no 400 días (NFR-1, D12)", () => {
  const options = withNodeEnv("production", () =>
    hardenSessionCookie({ path: "/", sameSite: "lax", httpOnly: false, maxAge: 400 * 86400 }),
  );
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
  assert.equal(SESSION_COOKIE_MAX_AGE_SECONDS, 12 * 60 * 60);
});

test("Sesión: en desarrollo sobre http la cookie no exige Secure (NFR-1, D12)", () => {
  const options = withNodeEnv("development", () => hardenSessionCookie({ maxAge: 400 * 86400 }));
  assert.equal(options.secure, false);
  assert.equal(options.httpOnly, true);
});

test("Sesión: borrar la cookie conserva maxAge 0 (NFR-1, D12)", () => {
  const options = hardenSessionCookie({ path: "/", maxAge: 0 });
  assert.equal(options.maxAge, 0);
  assert.equal(options.httpOnly, true);
});

test("Contraseña: solo una sesión recién abierta por invitación puede crearla (FR-11, D12)", () => {
  const now = 1_800_000_000;
  const otp = (secondsAgo) => ({ amr: [{ method: "otp", timestamp: now - secondsAgo }] });
  assert.equal(isFreshInvitationSession(otp(0), now), true);
  assert.equal(isFreshInvitationSession(otp(INVITATION_PASSWORD_WINDOW_SECONDS), now), true);
  assert.equal(isFreshInvitationSession(otp(INVITATION_PASSWORD_WINDOW_SECONDS + 1), now), false);
  assert.equal(isFreshInvitationSession(otp(-60), now), false, "una hora futura no cuenta");
  assert.equal(
    isFreshInvitationSession({ amr: [{ method: "password", timestamp: now }] }, now),
    false,
    "una sesión iniciada con contraseña no puede cambiarla sin la actual",
  );
  for (const claims of [null, undefined, {}, { amr: "otp" }, { amr: [{ method: "otp" }] }]) {
    assert.equal(isFreshInvitationSession(claims, now), false);
  }
});
