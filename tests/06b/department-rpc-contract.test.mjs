/**
 * DACTIVOS 06B-4 FIX1: asegura que el frontend envia el parametro real
 * p_is_active a la RPC. Solo mocks locales: NO conecta con Supabase.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadLocalTs } from "./helpers/load-ts.mjs";
const assetId = "11111111-1111-4111-8111-111111111111";
function setup(role = "ADMIN") {
  const calls = [],
    permissions = [],
    revalidations = [];
  const actions = loadLocalTs("src/app/actions/operations.ts", {
    "next/cache": { revalidatePath: (x) => revalidations.push(x) },
    "@/lib/auth/require-permission": {
      requirePermission: async (x) => {
        permissions.push(x);
        if (role !== "ADMIN" && x === "departments.manage") throw new Error("Forbidden");
        return { id: "mock", role };
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async (rpc, args) => {
          calls.push({ rpc, args });
          return { data: true, error: null };
        },
      }),
    },
    "@/lib/operations/contracts": { parseAssets: () => [] },
  });
  return { actions, calls, permissions, revalidations };
}
function form(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, String(v));
  return f;
}
test("Contrato real: cambiar estado envia p_is_active, no p_active", async () => {
  for (const active of ["true", "false"]) {
    const h = setup();
    const result = await h.actions.setDepartmentActive(
      form({ id: assetId, active, confirm: "yes" }),
    );
    assert.equal(result.ok, true);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].rpc, "dactivos_set_department_active");
    assert.equal(h.calls[0].args.p_department_id, assetId);
    assert.strictEqual(h.calls[0].args.p_is_active, active === "true");
    assert.equal(Object.hasOwn(h.calls[0].args, "p_active"), false);
    assert.equal(h.permissions[0], "departments.manage");
    assert.ok(h.revalidations.includes("/departamentos"));
  }
});
test("No hay RPC sin confirmacion o con valor de estado invalido", async () => {
  const h = setup();
  assert.equal(
    (await h.actions.setDepartmentActive(form({ id: assetId, active: "true" }))).ok,
    false,
  );
  assert.equal(
    (await h.actions.setDepartmentActive(form({ id: assetId, active: "no", confirm: "yes" }))).ok,
    false,
  );
  assert.equal(h.calls.length, 0);
  assert.equal(h.revalidations.length, 0);
});
test("SECURITY no llega a llamar la RPC administrativa", async () => {
  const h = setup("SECURITY");
  await assert.rejects(
    () => h.actions.setDepartmentActive(form({ id: assetId, active: "true", confirm: "yes" })),
    /Forbidden/,
  );
  assert.equal(h.calls.length, 0);
});
test("Script JWT 06B-4 tambien usa el nombre real de parametro", () => {
  const script = readFileSync("tests/06b/admin-denials-safe.mjs", "utf8");
  assert.match(
    script,
    /rpc:\s*["']dactivos_set_department_active["'],\s*args:\s*\{\s*p_department_id:\s*null,\s*p_is_active:\s*null\s*\}/,
  );
  assert.doesNotMatch(script, /p_active:\s*null/);
});
