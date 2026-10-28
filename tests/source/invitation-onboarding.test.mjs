import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");

test("Invitación: aceptación manual antes de consumir el token (FR-11, D6)", () => {
  const page = read("src/app/(auth)/aceptar-invitacion/page.tsx");
  const action = read("src/app/(auth)/aceptar-invitacion/actions.ts");
  assert.match(page, /<form action=\{acceptInvitation\}/);
  assert.match(page, /await connection\(\)/);
  assert.doesNotMatch(page, /verifyOtp/);
  assert.match(action, /confirmed !== "yes"/);
  assert.match(action, /type: "invite"/);
  assert.match(action, /auth\.verifyOtp/);
  assert.match(action, /redirect\("\/establecer-contrasena"\)/);
});

test("Contraseña: sesión comprobada y cierre de sesión al finalizar (FR-11, D6)", () => {
  const page = read("src/app/(auth)/establecer-contrasena/page.tsx");
  const action = read("src/app/(auth)/establecer-contrasena/actions.ts");
  assert.match(page, /await connection\(\)/);
  assert.match(page, /await supabase\.auth\.getUser\(\)/);
  assert.match(action, /newPasswordSchema\.safeParse\(formData\.get\("password"\)\)/);
  assert.match(action, /formData\.get\("confirmation"\) !== parsed\.data/);
  assert.match(action, /await supabase\.auth\.getUser\(\)/);
  assert.match(action, /await supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(action, /await supabase\.auth\.signOut\(\)/);
});

test("Contraseña: página y acción exigen una sesión recién abierta por invitación (FR-11, D12)", () => {
  const page = read("src/app/(auth)/establecer-contrasena/page.tsx");
  const action = read("src/app/(auth)/establecer-contrasena/actions.ts");
  for (const code of [page, action]) {
    assert.match(code, /await supabase\.auth\.getClaims\(\)/);
    assert.match(code, /isFreshInvitationSession\(session\?\.claims\)/);
  }
  // La comprobación ocurre antes de cambiar la contraseña.
  assert.ok(action.indexOf("isFreshInvitationSession(") < action.indexOf("updateUser("));
});

test("Solo usa SDK Auth y no inserta usuarios ni cambia permisos (FR-11, D6)", () => {
  for (const path of [
    "src/app/(auth)/aceptar-invitacion/actions.ts",
    "src/app/(auth)/establecer-contrasena/actions.ts",
  ]) {
    const code = read(path);
    assert.doesNotMatch(code, /service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.admin|\.from\(/);
  }
});

test("Invitación: la plantilla de correo envía el token hash, no un enlace que lo consuma (FR-11, D6)", () => {
  const template = read("supabase/templates/invite.html");
  assert.match(template, /\/aceptar-invitacion\?token_hash=\{\{ \.TokenHash \}\}/);
  assert.match(template, /type=invite/);
  assert.doesNotMatch(template, /ConfirmationURL/);
  assert.match(
    read("supabase/config.toml"),
    /content_path = "\.\/supabase\/templates\/invite\.html"/,
  );
});
