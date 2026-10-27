import assert from "node:assert/strict";
import { before, test } from "node:test";
import { call, createFixture, createUser, ok, rows, type TestUser } from "./support.ts";

// Several operators acting at the same moment: row locks and partial unique indexes must let
// exactly one request win, with no partial state left behind.

let adminUser: TestUser;
let operators: TestUser[];

before(async () => {
  adminUser = await createUser("ADMIN");
  operators = await Promise.all(Array.from({ length: 4 }, () => createUser("SECURITY")));
});

test("simultaneous deliveries of the same asset: exactly one succeeds", async () => {
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

test("simultaneous creation of the same internal code: exactly one asset is created", async () => {
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
