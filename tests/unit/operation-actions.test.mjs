import test from "node:test";
import assert from "node:assert/strict";
import { loadLocalTs } from "../helpers/load-ts.mjs";

const contracts = loadLocalTs("src/lib/operations/contracts.ts");

function fake() {
  const calls = [];
  const permissions = [];
  const revalidations = [];
  let assets = [];
  let error = null;
  const actions = loadLocalTs("src/app/actions/operations.ts", {
    "next/cache": { revalidatePath: (path) => revalidations.push(path) },
    "@/lib/auth/require-permission": {
      requirePermission: async (permission) => {
        permissions.push(permission);
        return { id: "qa", role: "ADMIN" };
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async (rpc, args) => {
          calls.push({ rpc, args });
          return rpc === "dactivos_list_assets"
            ? { data: assets, error: null }
            : { data: true, error };
        },
      }),
    },
    "@/lib/operations/contracts": { parseAssets: contracts.parseAssets },
  });
  return {
    actions,
    calls,
    permissions,
    revalidations,
    setAssets: (rows) => {
      assets = rows;
    },
    setError: (value) => {
      error = value;
    },
  };
}
function form(data) {
  const f = new FormData();
  for (const [key, value] of Object.entries(data)) f.set(key, String(value));
  return f;
}
const id1 = "11111111-1111-4111-8111-111111111111";
const id2 = "22222222-2222-4222-8222-222222222222";

test("Actions: datos invalidos de activo no llaman la base de datos", async () => {
  const t = fake();
  const r = await t.actions.createAsset(
    form({
      internal_code: "A",
      serial_number: "1",
      category_code: "OTHER",
      name: "X",
      description: "",
    }),
  );
  assert.equal(r.ok, false);
  assert.equal(t.calls.length, 0);
});
test("Actions: registro valido pasa argumentos reales a RPC, nunca tabla directa", async () => {
  const t = fake();
  const r = await t.actions.createAsset(
    form({
      internal_code: "QA_TEST_01",
      serial_number: "SERIAL_TEST_01",
      category_code: "HANDHELD",
      name: "Equipo QA",
      description: "",
    }),
  );
  assert.equal(r.ok, true);
  assert.equal(t.calls[0].rpc, "dactivos_create_asset");
  assert.equal(t.calls[0].args.p_internal_code, "QA_TEST_01");
  assert.deepEqual(Array.from(t.permissions), ["assets.create"]);
  assert.ok(t.revalidations.includes("/activos"));
});
test("Actions: creacion de departamento exige departments.manage", async () => {
  const t = fake();
  const r = await t.actions.createDepartment(form({ code: "QA06B_TI", name: "Tecnologia QA" }));
  assert.equal(r.ok, true);
  assert.equal(t.permissions[0], "departments.manage");
  assert.equal(t.calls[0].rpc, "dactivos_create_department");
});
test("Actions: intento de asignacion sin confirmacion no mueve datos", async () => {
  const t = fake();
  const r = await t.actions.assignAsset(
    form({ asset_ref: "QA_TEST_01", employee_id: id2, notes: "" }),
  );
  assert.equal(r.ok, false);
  assert.equal(t.calls.length, 0);
});
test("Actions: asignacion traduce codigo a UUID en servidor", async () => {
  const t = fake();
  t.setAssets([
    {
      id: id1,
      internal_code: "QA_TEST_01",
      serial_number: "SN06B",
      status: "AVAILABLE",
      category_code: "HANDHELD",
    },
  ]);
  const r = await t.actions.assignAsset(
    form({ asset_ref: "qa_test_01", employee_id: id2, notes: "", confirm: "yes" }),
  );
  assert.equal(r.ok, true);
  assert.equal(t.calls[0].rpc, "dactivos_list_assets");
  assert.equal(t.calls[1].rpc, "dactivos_assign_asset");
  assert.equal(t.calls[1].args.p_asset_id, id1);
  assert.ok(t.permissions.includes("assignments.create"));
});
test("Actions: referencia ambigua impide asignacion", async () => {
  const t = fake();
  t.setAssets([
    { id: id1, internal_code: "QA_DUP", serial_number: "UNO" },
    { id: id2, internal_code: "DOS", serial_number: "QA_DUP" },
  ]);
  const r = await t.actions.assignAsset(
    form({ asset_ref: "QA_DUP", employee_id: id2, confirm: "yes", notes: "" }),
  );
  assert.equal(r.ok, false);
  assert.equal(
    t.calls.some((x) => x.rpc === "dactivos_assign_asset"),
    false,
  );
});
test("Actions: devolucion DAMAGED exige descripcion suficiente", async () => {
  const t = fake();
  const r = await t.actions.returnAsset(
    form({ id: id1, condition: "DAMAGED", notes: "roto", confirm: "yes" }),
  );
  assert.equal(r.ok, false);
  assert.equal(t.calls.length, 0);
});
test("Actions: devolucion GOOD confirmada utiliza RPC autorizada", async () => {
  const t = fake();
  const r = await t.actions.returnAsset(
    form({ id: id1, condition: "GOOD", notes: "", confirm: "yes" }),
  );
  assert.equal(r.ok, true);
  assert.equal(t.calls[0].rpc, "dactivos_return_asset");
  assert.equal(t.permissions[0], "assignments.return");
});
test("Actions: resolucion exige justificacion y confirmacion", async () => {
  const t = fake();
  assert.equal(
    (await t.actions.resolveMaintenance(form({ id: id1, notes: "Muy corta", confirm: "yes" }))).ok,
    false,
  );
  assert.equal(t.calls.length, 0);
});
test("Actions: liberacion requiere confirmacion fisica explicita", async () => {
  const t = fake();
  assert.equal(
    (
      await t.actions.releaseAsset(
        form({ id: id1, notes: "Verificacion completa", confirm: "yes", physical: "no" }),
      )
    ).ok,
    false,
  );
  assert.equal(t.calls.length, 0);
  const r = await t.actions.releaseAsset(
    form({ id: id1, notes: "Verificacion completa", confirm: "yes", physical: "yes" }),
  );
  assert.equal(r.ok, true);
  assert.equal(t.calls[0].rpc, "dactivos_release_asset");
  assert.equal(t.permissions[0], "maintenance.validate");
});
test("Actions: error 42501 no expone mensajes SQL al cliente", async () => {
  const t = fake();
  t.setError({ code: "42501", message: "SQL secreto interno" });
  const r = await t.actions.updateAsset(form({ id: id1, name: "Equipo QA", description: "" }));
  assert.equal(r.ok, false);
  assert.ok(!r.message.includes("SQL secreto interno"));
});
