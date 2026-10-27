/**
 * DACTIVOS 06B-3: pruebas LOCALES con backend simulado.
 * No crea sesiones de Supabase ni hace peticiones HTTP.
 * IMPORTANTE: no demuestra atomicidad real de PostgreSQL bajo concurrencia.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadLocalTs } from "./helpers/load-ts.mjs";

const contracts = loadLocalTs("src/lib/operations/contracts.ts");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const EMP = "33333333-3333-4333-8333-333333333333";
const C = "44444444-4444-4444-8444-444444444444";
function form(fields) {
  const result = new FormData();
  for (const [key, value] of Object.entries(fields)) result.set(key, String(value));
  return result;
}
function harness(backend, role = "ADMIN") {
  const calls = [];
  const permissions = [];
  const revalidation = [];
  const actions = loadLocalTs("src/app/actions/operations.ts", {
    "next/cache": { revalidatePath: (path) => revalidation.push(path) },
    "@/lib/auth/require-permission": {
      requirePermission: async (permission) => {
        permissions.push(permission);
        if (role === "SECURITY" && permission === "departments.manage") throw Error("Forbidden");
        return { id: EMP, role };
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async (name, args) => {
          calls.push({ name, args });
          await Promise.resolve();
          return backend(name, args);
        },
      }),
    },
    "@/lib/operations/contracts": { parseAssets: contracts.parseAssets },
  });
  return { actions, calls, permissions, revalidation };
}
const pgError = (code, message = "SQL internal details: confidential") => ({
  data: null,
  error: { code, message },
});
const ok = (data) => ({ data, error: null });

// Se simula la respuesta de un bloqueo atomico en PostgreSQL.
// Esta simulacion prueba que el frontend no reintente las escrituras rechazadas.
test("Simulacion: dos entregas del mismo activo, una aceptada y otra rechazada, sin reintentos", async () => {
  let assigned = false;
  const h = harness((name) => {
    if (name === "dactivos_list_assets")
      return ok([
        {
          id: A,
          internal_code: "QA06B3_HH",
          serial_number: "SERIAL06B3",
          category_code: "HANDHELD",
          status: "AVAILABLE",
        },
      ]);
    if (name === "dactivos_assign_asset") {
      if (assigned) return pgError("23514");
      assigned = true;
      return ok(C);
    }
    throw Error("Unexpected RPC " + name);
  });
  const results = await Promise.all(
    [1, 2].map(() =>
      h.actions.assignAsset(
        form({ asset_ref: "QA06B3_HH", employee_id: EMP, notes: "", confirm: "yes" }),
      ),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok).length, 1);
  assert.equal(h.calls.filter((c) => c.name === "dactivos_assign_asset").length, 2);
  assert.equal(h.revalidation.length, 6);
});

test("Simulacion: dos devoluciones de la misma asignacion no producen reintentos", async () => {
  let returned = false;
  const h = harness((name) => {
    assert.equal(name, "dactivos_return_asset");
    if (returned) return pgError("23514");
    returned = true;
    return ok(true);
  });
  const results = await Promise.all(
    [1, 2].map(() =>
      h.actions.returnAsset(form({ id: A, condition: "GOOD", notes: "", confirm: "yes" })),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok).length, 1);
  assert.equal(h.calls.length, 2);
});

test("Simulacion: dos liberaciones fisicas sobre el mismo activo no producen reintentos", async () => {
  let released = false;
  const h = harness((name) => {
    assert.equal(name, "dactivos_release_asset");
    if (released) return pgError("23514");
    released = true;
    return ok(C);
  });
  const results = await Promise.all(
    [1, 2].map(() =>
      h.actions.releaseAsset(
        form({
          id: A,
          notes: "Se verifico el equipo fisicamente",
          physical: "yes",
          confirm: "yes",
        }),
      ),
    ),
  );
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok).length, 1);
  assert.equal(h.calls.length, 2);
});

test("Simulacion: crear dos activos con codigo identico no reintenta violacion UNIQUE", async () => {
  const codes = new Set();
  const h = harness((name, args) => {
    assert.equal(name, "dactivos_create_asset");
    const code = args.p_internal_code.toUpperCase();
    if (codes.has(code)) return pgError("23505");
    codes.add(code);
    return ok(A);
  });
  const fields = {
    internal_code: "QA06B3-PC",
    serial_number: "SN06B3",
    category_code: "COMPUTER",
    name: "PC QA06B3",
    description: "",
  };
  const results = await Promise.all([1, 2].map(() => h.actions.createAsset(form(fields))));
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok).length, 1);
  assert.equal(h.calls.length, 2);
});

test("Simulacion: dos resoluciones del mismo caso, segunda rechazada", async () => {
  let resolved = false;
  const h = harness((name) => {
    assert.equal(name, "dactivos_resolve_maintenance");
    if (resolved) return pgError("23514");
    resolved = true;
    return ok(true);
  });
  const fields = { id: A, notes: "Reparacion verificada y documentada", confirm: "yes" };
  const results = await Promise.all([1, 2].map(() => h.actions.resolveMaintenance(form(fields))));
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok).length, 1);
  assert.equal(h.calls.length, 2);
});

test("Errores 40P01 y 40001 no se muestran como detalles internos ni disparan reintentos", async () => {
  for (const code of ["40P01", "40001"]) {
    const h = harness((name) => {
      assert.equal(name, "dactivos_return_asset");
      return pgError(code);
    });
    const result = await h.actions.returnAsset(
      form({ id: A, condition: "GOOD", notes: "", confirm: "yes" }),
    );
    assert.equal(result.ok, false);
    assert.match(result.message, /otra operaci[oó]n|estado/i);
    assert.doesNotMatch(result.message, /confidential|SQL internal details/i);
    assert.equal(h.calls.length, 1);
    assert.equal(h.revalidation.length, 0);
  }
});

test("Violaciones 23505/23514 y errores imprevistos no exponen SQL interno", async () => {
  for (const code of ["23505", "23514", "P0001", "42501"]) {
    const h = harness((name) => {
      assert.equal(name, "dactivos_update_asset");
      return pgError(code);
    });
    const result = await h.actions.updateAsset(
      form({ id: A, name: "Equipo actualizado", description: "" }),
    );
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.message, /confidential|SQL internal details/i);
    assert.equal(h.calls.length, 1);
    assert.equal(h.revalidation.length, 0);
  }
});

test("Sin confirmacion de devolucion fisica nunca se hace RPC", async () => {
  const h = harness(() => {
    throw Error("No debe consultar DB");
  });
  const result = await h.actions.returnAsset(form({ id: A, condition: "GOOD", notes: "" }));
  assert.equal(result.ok, false);
  assert.equal(h.calls.length, 0);
});

test("Sin verificacion fisica no se ejecuta liberacion", async () => {
  const h = harness(() => {
    throw Error("No debe consultar DB");
  });
  const result = await h.actions.releaseAsset(
    form({ id: A, physical: "no", notes: "La inspeccion no se ha confirmado", confirm: "yes" }),
  );
  assert.equal(result.ok, false);
  assert.equal(h.calls.length, 0);
});

test("Permiso SECURITY prohibido: no invoca RPC ni revalida paginas", async () => {
  const h = harness(() => {
    throw Error("No debe consultar DB");
  }, "SECURITY");
  await assert.rejects(
    () => h.actions.createDepartment(form({ code: "QA_TEST", name: "Un departamento QA" })),
    /Forbidden/,
  );
  assert.equal(h.calls.length, 0);
  assert.equal(h.revalidation.length, 0);
});

test("Ante referencia ambigua no hay movimientos incluso con confirmacion", async () => {
  const h = harness((name) => {
    assert.equal(name, "dactivos_list_assets");
    return ok([
      { id: A, internal_code: "DUPLICADO", serial_number: "A" },
      { id: B, internal_code: "B", serial_number: "DUPLICADO" },
    ]);
  });
  const result = await h.actions.assignAsset(
    form({ asset_ref: "DUPLICADO", employee_id: EMP, notes: "", confirm: "yes" }),
  );
  assert.equal(result.ok, false);
  assert.equal(h.calls.filter((c) => c.name === "dactivos_assign_asset").length, 0);
});
