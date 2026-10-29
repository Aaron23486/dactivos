import assert from "node:assert/strict";
import { before, test } from "node:test";
import { call, createFixture, createUser, ok, rows, type TestUser } from "./support.ts";

// Varios operadores al mismo tiempo: los bloqueos de fila y los índices únicos parciales deben
// dejar ganar exactamente una solicitud, sin estados a medias.

let adminUser: TestUser;
let operators: TestUser[];

before(async () => {
  adminUser = await createUser("ADMIN");
  operators = await Promise.all(Array.from({ length: 4 }, () => createUser("SECURITY")));
});

test("entregas simultáneas del mismo activo: exactamente una tiene éxito (R2, NFR-2)", async () => {
  const f = await createFixture(adminUser.client, "RACE", { employees: 4, handhelds: 1 });
  const hh = f.asset("HH1");

  const results = await Promise.all(
    operators.map((operator, i) =>
      call(operator.client, "dactivos_assign_asset", {
        p_asset_id: hh,
        p_employee_id: f.employeeIds[i],
      }),
    ),
  );
  const winners = results.filter((r) => r.code === null);
  assert.equal(winners.length, 1, JSON.stringify(results.map((r) => r.code)));
  for (const r of results.filter((r) => r.code !== null)) {
    assert.ok(["23505", "23514", "40001", "40P01"].includes(String(r.code)), String(r.code));
  }

  const open = rows(await ok(adminUser.client, "dactivos_list_assignments")).filter(
    (a) => a.asset_id === hh && !a.returned_at,
  );
  assert.equal(open.length, 1);
});

test("altas simultáneas con el mismo código interno: se crea exactamente un activo (R8, NFR-2)", async () => {
  const f = await createFixture(adminUser.client, "DUPCODE", { employees: 0, handhelds: 0 });
  const code = `${f.prefix}-SAME`;
  const results = await Promise.all(
    operators.map((operator, i) =>
      call(operator.client, "dactivos_create_asset", {
        p_internal_code: code,
        p_serial_number: `SN-${code}-${i}`,
        p_category_code: "HANDHELD",
        p_name: "Alta simultánea",
        p_description: "",
      }),
    ),
  );
  assert.equal(results.filter((r) => r.code === null).length, 1);
  const created = rows(await ok(adminUser.client, "dactivos_list_assets")).filter(
    (a) => a.internal_code === code,
  );
  assert.equal(created.length, 1);
});
