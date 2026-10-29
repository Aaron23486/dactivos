import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { anonClient, call, createUser, rows, type TestUser } from "./support.ts";

// La autorización vive en la base: todas las tablas están cerradas y cada RPC comprueba el rol.

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

// RPC solo de ADMIN, llamadas con argumentos válidos pero inofensivos: el rol se comprueba primero.
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
  [
    "dactivos_admin_log_report_export",
    { p_kind: "employees", p_date_from: null, p_date_to: null, p_row_count: 0 },
  ],
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

describe("visitante anónimo (R1)", () => {
  test("no puede leer ninguna tabla", async () => {
    const anon = anonClient();
    for (const table of TABLES) {
      const { error } = await anon.from(table).select("*").limit(1);
      assert.ok(error, `${table} must not be readable anonymously`);
    }
  });

  test("no puede ejecutar ninguna RPC", async () => {
    const anon = anonClient();
    for (const name of [...READ_RPCS, "current_app_role", ...ADMIN_ONLY.map(([n]) => n)]) {
      const args = ADMIN_ONLY.find(([n]) => n === name)?.[1] ?? {};
      assert.notEqual((await call(anon, name, args)).code, null, name);
    }
  });
});

describe("cuenta con sesión sin perfil activo (R1, R13)", () => {
  test("no tiene rol y se le niega toda lectura", async () => {
    for (const user of [noProfile, inactive]) {
      assert.equal((await call(user.client, "current_app_role")).data, null);
      for (const name of READ_RPCS) {
        assert.equal((await call(user.client, name)).code, "42501", name);
      }
    }
  });
});

describe("rol SECURITY (FR-1, R1)", () => {
  test("lee las listas operativas", async () => {
    for (const name of READ_RPCS) assert.equal((await call(security.client, name)).code, null);
  });

  test("no puede leer tablas directamente", async () => {
    for (const table of TABLES) {
      const { error } = await security.client.from(table).select("*").limit(1);
      assert.ok(error, `${table} must not be readable directly`);
    }
  });

  test("se le niega toda RPC administrativa", async () => {
    for (const [name, args] of ADMIN_ONLY) {
      assert.equal((await call(security.client, name, args)).code, "42501", name);
    }
  });

  test("no ve eventos de cuentas, configuración, bajas ni reportes en el historial (FR-9)", async () => {
    const events = rows(
      (await call(security.client, "dactivos_list_audit_events", { p_limit: 100, p_offset: 0 }))
        .data,
    );
    const sources = new Set(events.map((e) => e.source));
    for (const hidden of ["ADMINISTRACION", "OPERATIVO", "CICLO_VIDA", "REPORTE"]) {
      assert.ok(!sources.has(hidden), `${hidden} must be hidden from SECURITY`);
    }
  });
});

describe("rol ADMIN (FR-1, R1)", () => {
  test("puede usar las lecturas administrativas", async () => {
    assert.equal((await call(adminUser.client, "dactivos_admin_list_users")).code, null);
    const report = await call(adminUser.client, "dactivos_admin_report_page", {
      p_kind: "assets",
      p_limit: 10,
      p_offset: 0,
    });
    assert.equal(report.code, null);
  });

  test("ve los eventos de cuentas en el historial (FR-9)", async () => {
    const events = rows(
      (await call(adminUser.client, "dactivos_list_audit_events", { p_limit: 100, p_offset: 0 }))
        .data,
    );
    assert.ok(events.some((e) => e.source === "ADMINISTRACION"));
  });

  test("no puede ejecutar la RPC de cuentas solo de terminal (FR-12)", async () => {
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
