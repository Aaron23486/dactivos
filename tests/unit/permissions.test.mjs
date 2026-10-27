import test from "node:test";
import assert from "node:assert/strict";
import { loadLocalTs } from "../helpers/load-ts.mjs";

const p = loadLocalTs("src/lib/auth/permissions.ts");

test("RBAC: ADMIN recibe los permisos catalogados", () => {
  assert.deepEqual(Array.from(p.ROLE_PERMISSIONS.ADMIN), Array.from(p.PERMISSIONS));
});
test("RBAC: SECURITY conserva permisos operativos", () => {
  for (const permission of [
    "assets.read",
    "employees.create",
    "assignments.create",
    "assignments.return",
    "maintenance.update",
    "maintenance.validate",
    "departments.read",
  ]) {
    assert.equal(p.hasPermission("SECURITY", permission), true, permission);
  }
});
test("RBAC: SECURITY no administra ni exporta", () => {
  for (const permission of [
    "departments.manage",
    "users.manage",
    "settings.manage",
    "reports.export",
    "history.correct",
    "assets.retire",
    "assets.reactivate",
  ]) {
    assert.equal(p.hasPermission("SECURITY", permission), false, permission);
  }
});
test("RBAC: perfiles nulos, desconocidos o falsificados son rechazados", () => {
  for (const role of [null, undefined, "admin", "USER", "", { role: "ADMIN" }, 1]) {
    assert.equal(p.isAppRole(role), false);
    assert.equal(p.hasPermission(role, "assets.read"), false);
  }
});
test("RBAC: catalogos sin permisos duplicados y sin accesos inesperados", () => {
  assert.equal(new Set(Array.from(p.PERMISSIONS)).size, p.PERMISSIONS.length);
  assert.equal(
    new Set(Array.from(p.ROLE_PERMISSIONS.SECURITY)).size,
    p.ROLE_PERMISSIONS.SECURITY.length,
  );
  for (const permission of p.ROLE_PERMISSIONS.SECURITY)
    assert.ok(p.PERMISSIONS.includes(permission));
});
