import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// La parte de base de datos de la administración de cuentas (último ADMIN, auditoría, permisos)
// la cubre tests/integration/accounts.test.ts contra una base real.
const action = readFileSync("src/app/actions/users.ts", "utf8");
const page = readFileSync("src/app/(dashboard)/usuarios/page.tsx", "utf8");
const board = readFileSync("src/components/users/admin-users-board.tsx", "utf8");

test("Acceso: acción solo del servidor y exige permiso administrativo (FR-11, R12)", () => {
  assert.match(action, /^["']use server["'];/);
  assert.match(action, /requirePermission\("users\.manage"\)/);
  assert.match(page, /requirePermission\("users\.manage"\)/);
});
test("Acceso: formulario exige confirmación, UUID, rol, estado y motivo (FR-11, R12)", () => {
  for (const rule of [
    /z\.string\(\)\.uuid\(\)/,
    /z\.enum\(\["ADMIN", "SECURITY"\]\)/,
    /z\.enum\(\["true", "false"\]\)/,
    /\.min\(10\)\s*\.max\(500\)/,
    /z\.literal\("yes"\)/,
  ])
    assert.match(action, rule);
});
test("Acceso: cliente no puede operar cuenta propia (FR-11, R12)", () => {
  assert.match(action, /actor\.id === input\.id/);
  assert.match(board, /u\.id === actorId/);
});
test("Acceso: la acción envía los parámetros de la RPC por nombre (FR-11, R12)", () => {
  assert.match(action, /rpc\("dactivos_admin_set_user_access"/);
  for (const key of ["p_user_id", "p_role", "p_is_active", "p_reason"]) {
    assert.match(action, new RegExp(key + ":"));
  }
});
test("Acceso: nunca usa service_role, supabase.auth.admin ni acceso directo a tablas (FR-11, R12)", () => {
  for (const code of [action, board, page]) {
    assert.doesNotMatch(
      code,
      /SUPABASE_SERVICE_ROLE_KEY|supabase\.auth\.admin|\.from\(["']profiles["']\)/i,
    );
  }
});
test("Acceso: no retorna detalles internos de PostgreSQL al usuario (FR-11, R12)", () => {
  assert.doesNotMatch(action, /message:\s*error\.message/);
  assert.match(action, /error\.code/);
});
test("Acceso: opciones de edición solo para perfiles vinculados (FR-11, R12)", () => {
  assert.match(board, /!u\.role \|\| u\.is_active === null/);
  assert.match(board, /action=\{setUserAccess\}/);
  assert.match(board, /name:\s*"confirm"/);
});
