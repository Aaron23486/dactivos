import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadLocalTs } from "../helpers/load-ts.mjs";

const users = loadLocalTs("src/lib/users/contracts.ts");
const mock = [
  {
    id: "id-admin",
    email: "admin@example.com",
    role: "ADMIN",
    is_active: true,
    email_confirmed: true,
    created_at: "2026-10-11T00:00:00Z",
    last_sign_in_at: null,
  },
  {
    id: "id-sec",
    email: "sec@example.com",
    role: "SECURITY",
    is_active: false,
    email_confirmed: false,
    created_at: null,
    last_sign_in_at: "2026-10-10T00:00:00Z",
  },
  {
    id: "id-orphan",
    email: "orphan@example.com",
    role: null,
    is_active: null,
    email_confirmed: false,
    created_at: null,
    last_sign_in_at: null,
  },
];
test("Directorio: no fabrica usuarios ante una respuesta nula", () =>
  assert.equal(users.parseAdminUsers(null).length, 0));
test("Directorio: administra ADMIN, SECURITY y usuarios sin perfil sin inventar roles", () => {
  const [a, b, c] = users.parseAdminUsers(mock);
  assert.equal(a.role, "ADMIN");
  assert.equal(b.role, "SECURITY");
  assert.equal(c.role, null);
});
test("Directorio: los estados solo aceptan booleanos reales", () => {
  const [u] = users.parseAdminUsers([{ id: "1", role: "SECURITY", is_active: "true" }]);
  assert.equal(u.is_active, null);
  assert.equal(users.userStatus(u), "UNLINKED");
});
test("Directorio: los perfiles sin enlace y los inactivos no son activos", () => {
  assert.deepEqual(Array.from(users.parseAdminUsers(mock), users.userStatus), [
    "ACTIVE",
    "INACTIVE",
    "UNLINKED",
  ]);
});
test("Directorio: elimina identificadores duplicados y entradas inválidas", () => {
  assert.equal(users.parseAdminUsers([mock[0], mock[0], null, {}, [], { id: "" }]).length, 1);
});
test("Directorio: marcas de tiempo inválidas se devuelven como null", () => {
  const [u] = users.parseAdminUsers([
    { id: "x", created_at: "nunca", last_sign_in_at: "2026-10-11" },
  ]);
  assert.equal(u.created_at, null);
  assert.equal(u.last_sign_in_at, "2026-10-11");
});
test("Seguridad: página requiere users.manage y no usa tablas directas", () => {
  const page = readFileSync("src/app/(dashboard)/usuarios/page.tsx", "utf8");
  const server = readFileSync("src/lib/users/server-data.ts", "utf8");
  assert.match(page, /requirePermission\("users\.manage"\)/);
  assert.match(server, /rpc\("dactivos_admin_list_users"\)/);
  assert.doesNotMatch(server, /\.from\(/);
});
test("Seguridad: SECURITY no visualiza navegación Usuarios", () => {
  const shell = readFileSync("src/components/layout/app-shell.tsx", "utf8");
  const nav = readFileSync("src/lib/navigation.ts", "utf8");
  assert.match(nav, /href:\s*"\/usuarios"/);
  // El menu conserva exclusiones administrativas al agregar Reportes.
  // No fijar el numero de entradas: futuras rutas ADMIN pueden añadirse.
  const adminOnlyList = shell.match(/\[([^\]]+)\]\.includes\(item\.href\)/);
  assert.ok(adminOnlyList, "Falta la lista de rutas exclusivas de ADMIN");
  const excluded = [...adminOnlyList[1].matchAll(/["'](\/[^"']+)["']/g)].map((m) => m[1]);
  for (const restricted of ["/configuracion", "/usuarios", "/reportes"]) {
    assert.ok(excluded.includes(restricted), `${restricted} debe ser exclusiva de ADMIN`);
    assert.match(nav, new RegExp(`href:\\s*"${restricted}"`));
  }
  assert.match(shell, /role\s*===\s*"ADMIN"/);
  assert.match(shell, /role === "ADMIN"/);
});
test("Seguridad: ninguna clave privilegiada ni mutaciones sobre perfiles", () => {
  for (const name of [
    "src/lib/users/contracts.ts",
    "src/lib/users/server-data.ts",
    "src/app/(dashboard)/usuarios/page.tsx",
    "src/components/users/admin-users-board.tsx",
  ]) {
    const code = readFileSync(name, "utf8");
    assert.doesNotMatch(
      code,
      /service.role.key|SUPABASE_SERVICE_ROLE_KEY|supabase\.auth\.admin|\.from\("profiles"\)/i,
    );
  }
});
