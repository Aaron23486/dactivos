import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { anonClient, call, createUser, rows, type TestUser } from "./support.ts";

// Authorization lives in the database: every table is closed and each RPC checks the caller's role.

const TABLES = [
  "admin_audit_log",
  "asset_assignments",
  "asset_categories",
  "asset_lifecycle_log",
  "asset_maintenance_cases",
  "asset_release_consumptions",
  "asset_release_validations",
  "asset_return_inspections",
  "assets",
  "assignment_audit_log",
  "departments",
  "employees",
  "maintenance_audit_log",
  "operational_audit_log",
  "profiles",
];

const READ_RPCS = [
  "dactivos_list_assets",
  "dactivos_list_asset_categories",
  "dactivos_list_departments",
  "dactivos_list_employees",
  "dactivos_list_assignments",
  "dactivos_list_maintenance_cases",
];

// Admin-only RPCs, called with well-formed but harmless arguments: the role check comes first.
const NIL = "00000000-0000-4000-8000-000000000000";
const ADMIN_ONLY: [string, Record<string, unknown>][] = [
  ["dactivos_admin_list_users", {}],
  ["dactivos_admin_report_page", { p_kind: "assets", p_limit: 10, p_offset: 0 }],
  [
    "dactivos_admin_set_user_access",
    { p_user_id: NIL, p_role: "SECURITY", p_is_active: false, p_reason: "Prueba de autorización" },
  ],
  [
    "dactivos_admin_change_asset_lifecycle",
    { p_asset_id: NIL, p_reactivate: false, p_reason: "Prueba de autorización" },
  ],
  [
    "dactivos_admin_link_invited_user",
    { p_user_id: NIL, p_role: "SECURITY", p_reason: "Prueba de autorización" },
  ],
  ["dactivos_create_department", { p_code: "NO_PERMITIDO", p_name: "No permitido" }],
  ["dactivos_set_department_active", { p_department_id: NIL, p_is_active: false }],
];

let adminUser: TestUser;
let security: TestUser;
let noProfile: TestUser;
let inactive: TestUser;

before(async () => {
  [adminUser, security, noProfile, inactive] = await Promise.all([
    createUser("ADMIN"),
    createUser("SECURITY"),
    createUser(null),
    createUser("SECURITY", { active: false }),
  ]);
});

describe("anonymous visitor (R1)", () => {
  test("cannot read any table", async () => {
    const anon = anonClient();
    for (const table of TABLES) {
      const { error } = await anon.from(table).select("*").limit(1);
      assert.ok(error, `${table} must not be readable anonymously`);
    }
  });

  test("cannot execute any RPC", async () => {
    const anon = anonClient();
    for (const name of [...READ_RPCS, "current_app_role", ...ADMIN_ONLY.map(([n]) => n)]) {
      const args = ADMIN_ONLY.find(([n]) => n === name)?.[1] ?? {};
      assert.notEqual((await call(anon, name, args)).code, null, name);
    }
  });
});

describe("signed-in account without an active profile (R1, R13)", () => {
  test("has no role and every read is refused", async () => {
    for (const user of [noProfile, inactive]) {
      assert.equal((await call(user.client, "current_app_role")).data, null);
      for (const name of READ_RPCS) {
        assert.equal((await call(user.client, name)).code, "42501", name);
      }
    }
  });
});

describe("SECURITY role (FR-1, R1)", () => {
  test("reads the operational lists", async () => {
    for (const name of READ_RPCS) assert.equal((await call(security.client, name)).code, null);
  });

  test("cannot read tables directly", async () => {
    for (const table of TABLES) {
      const { error } = await security.client.from(table).select("*").limit(1);
      assert.ok(error, `${table} must not be readable directly`);
    }
  });

  test("is refused every administrative RPC", async () => {
    for (const [name, args] of ADMIN_ONLY) {
      assert.equal((await call(security.client, name, args)).code, "42501", name);
    }
  });

  test("sees no account, configuration or retirement events in the history (FR-9)", async () => {
    const events = rows(
      (await call(security.client, "dactivos_list_audit_events", { p_limit: 100, p_offset: 0 }))
        .data,
    );
    const sources = new Set(events.map((e) => e.source));
    for (const hidden of ["ADMINISTRACION", "OPERATIVO", "CICLO_VIDA"]) {
      assert.ok(!sources.has(hidden), `${hidden} must be hidden from SECURITY`);
    }
  });
});

describe("ADMIN role (FR-1, R1)", () => {
  test("can call the administrative reads", async () => {
    assert.equal((await call(adminUser.client, "dactivos_admin_list_users")).code, null);
    const report = await call(adminUser.client, "dactivos_admin_report_page", {
      p_kind: "assets",
      p_limit: 10,
      p_offset: 0,
    });
    assert.equal(report.code, null);
  });

  test("sees account events in the history (FR-9)", async () => {
    const events = rows(
      (await call(adminUser.client, "dactivos_list_audit_events", { p_limit: 100, p_offset: 0 }))
        .data,
    );
    assert.ok(events.some((e) => e.source === "ADMINISTRACION"));
  });

  test("cannot run the terminal-only account RPC (FR-12)", async () => {
    const result = await call(adminUser.client, "dactivos_terminal_set_access", {
      p_user_id: security.id,
      p_role: "ADMIN",
      p_is_active: true,
      p_reason: "Escalamiento no permitido",
    });
    assert.notEqual(result.code, null);
    assert.equal((await call(security.client, "current_app_role")).data, "SECURITY");
  });
});
