import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");

test("Invitación: aceptación manual antes de consumir el token", () => {
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

test("Contraseña: sesión comprobada y cierre de sesión al finalizar", () => {
  const page = read("src/app/(auth)/establecer-contrasena/page.tsx");
  const action = read("src/app/(auth)/establecer-contrasena/actions.ts");
  assert.match(page, /await connection\(\)/);
  assert.match(page, /await supabase\.auth\.getUser\(\)/);
  assert.match(action, /password\.length < 12/);
  assert.match(action, /password !== confirmation/);
  assert.match(action, /await supabase\.auth\.getUser\(\)/);
  assert.match(action, /await supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(action, /await supabase\.auth\.signOut\(\)/);
});

test("Solo usa SDK Auth y no inserta usuarios ni cambia permisos", () => {
  for (const path of [
    "src/app/(auth)/aceptar-invitacion/actions.ts",
    "src/app/(auth)/establecer-contrasena/actions.ts",
  ]) {
    const code = read(path);
    assert.doesNotMatch(code, /service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.admin|\.from\(/);
  }
  assert.match(read("docs/07FINAL-CIERRE-INVITACIONES.md"), /TokenHash/);
  assert.match(read("docs/07FINAL-CIERRE-INVITACIONES.md"), /type=invite/);
});
