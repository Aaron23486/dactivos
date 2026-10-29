import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  admin,
  assetStatus,
  call,
  createFixture,
  createUser,
  ok,
  rows,
  type TestUser,
} from "./support.ts";

// Reglas del inventario que aplica la base, probadas con las mismas RPC que usan las pantallas.

let adminUser: TestUser;
let security: TestUser;

before(async () => {
  [adminUser, security] = await Promise.all([createUser("ADMIN"), createUser("SECURITY")]);
});

async function openAssignmentId(client: TestUser["client"], assetId: string): Promise<string> {
  const open = rows(await ok(client, "dactivos_list_assignments")).find(
    (a) => a.asset_id === assetId && !a.returned_at,
  );
  assert.ok(open, "the asset should have an open assignment");
  return String(open.id);
}

test("un activo solo se entrega una vez hasta que se devuelve (FR-5, R2)", async () => {
  const f = await createFixture(adminUser.client, "ONCE");
  const hh = f.asset("HH1");
  await ok(security.client, "dactivos_assign_asset", {
    p_asset_id: hh,
    p_employee_id: f.employeeIds[0],
  });
  assert.equal(await assetStatus(security.client, hh), "ASSIGNED");

  const second = await call(security.client, "dactivos_assign_asset", {
    p_asset_id: hh,
    p_employee_id: f.employeeIds[1],
  });
  assert.equal(second.code, "23514");

  await ok(security.client, "dactivos_return_asset", {
    p_assignment_id: await openAssignmentId(security.client, hh),
    p_condition: "GOOD",
    p_notes: null,
  });
  assert.equal(await assetStatus(security.client, hh), "AVAILABLE");
});

test("un empleado tiene como máximo un activo abierto por categoría (R3)", async () => {
  const f = await createFixture(adminUser.client, "CATEGORY", { employees: 1, computers: 1 });
  await ok(security.client, "dactivos_assign_asset", {
    p_asset_id: f.asset("HH1"),
    p_employee_id: f.employeeIds[0],
  });
  const secondHandheld = await call(security.client, "dactivos_assign_asset", {
    p_asset_id: f.asset("HH2"),
    p_employee_id: f.employeeIds[0],
  });
  assert.ok(["23505", "23514"].includes(String(secondHandheld.code)), String(secondHandheld.code));

  // Otra categoría sí se permite.
  await ok(security.client, "dactivos_assign_asset", {
    p_asset_id: f.asset("PC1"),
    p_employee_id: f.employeeIds[0],
  });
});

test("una devolución dañada va a mantenimiento y requiere resolución y revisión física (FR-6, FR-7, R5–R7)", async () => {
  const f = await createFixture(adminUser.client, "DAMAGED", { employees: 1, handhelds: 1 });
  const hh = f.asset("HH1");
  await ok(security.client, "dactivos_assign_asset", {
    p_asset_id: hh,
    p_employee_id: f.employeeIds[0],
  });
  await ok(security.client, "dactivos_return_asset", {
    p_assignment_id: await openAssignmentId(security.client, hh),
    p_condition: "DAMAGED",
    p_notes: "Pantalla rota durante la jornada de prueba.",
  });
  assert.equal(await assetStatus(security.client, hh), "MAINTENANCE");

  const maintenanceCase = rows(await ok(security.client, "dactivos_list_maintenance_cases")).find(
    (c) => c.asset_id === hh && c.status === "OPEN",
  );
  assert.ok(maintenanceCase, "a maintenance case is opened automatically");

  const releaseTooEarly = await call(security.client, "dactivos_release_asset", {
    p_asset_id: hh,
    p_physically_verified: true,
    p_validation_notes: "Intento de liberar sin resolver.",
  });
  assert.notEqual(releaseTooEarly.code, null);
  assert.equal(await assetStatus(security.client, hh), "MAINTENANCE");

  await ok(security.client, "dactivos_resolve_maintenance", {
    p_case_id: maintenanceCase.id,
    p_resolution_notes: "Se reemplazó la pantalla y se probó el lector.",
  });
  await ok(security.client, "dactivos_release_asset", {
    p_asset_id: hh,
    p_physically_verified: true,
    p_validation_notes: "Revisado en sitio, funciona correctamente.",
  });
  assert.equal(await assetStatus(security.client, hh), "AVAILABLE");
});

test("solo un activo disponible se da de baja, y la baja queda auditada e inmutable (FR-8, R5, R11)", async () => {
  const f = await createFixture(adminUser.client, "RETIRE", { employees: 1, handhelds: 2 });
  await ok(adminUser.client, "dactivos_assign_asset", {
    p_asset_id: f.asset("HH2"),
    p_employee_id: f.employeeIds[0],
  });
  const assigned = await call(adminUser.client, "dactivos_admin_change_asset_lifecycle", {
    p_asset_id: f.asset("HH2"),
    p_reactivate: false,
    p_reason: "No debe permitirse con entrega abierta.",
  });
  assert.equal(assigned.code, "23514");

  const hh = f.asset("HH1");
  const retired = await ok(adminUser.client, "dactivos_admin_change_asset_lifecycle", {
    p_asset_id: hh,
    p_reactivate: false,
    p_reason: "Equipo de prueba fuera de servicio.",
  });
  assert.equal(retired, true);
  assert.equal(await assetStatus(adminUser.client, hh), "RETIRED");

  const delivery = await call(adminUser.client, "dactivos_assign_asset", {
    p_asset_id: hh,
    p_employee_id: f.employeeIds[0],
  });
  assert.equal(delivery.code, "23514", "a retired asset cannot be delivered");

  // Ni con la clave de servicio (que salta RLS) se puede reescribir el registro de bajas.
  const { data: log } = await admin
    .from("asset_lifecycle_log")
    .select("id")
    .eq("asset_id", hh)
    .single();
  assert.ok(log, "the retirement is logged");
  const { error: updateError } = await admin
    .from("asset_lifecycle_log")
    .update({ reason: "Motivo reescrito después del hecho." })
    .eq("id", log.id);
  assert.ok(updateError, "the lifecycle log is append-only");
  const { error: deleteError } = await admin.from("asset_lifecycle_log").delete().eq("id", log.id);
  assert.ok(deleteError, "the lifecycle log is append-only");

  await ok(adminUser.client, "dactivos_admin_change_asset_lifecycle", {
    p_asset_id: hh,
    p_reactivate: true,
    p_reason: "Equipo reparado por el proveedor.",
  });
  assert.equal(await assetStatus(adminUser.client, hh), "AVAILABLE");
});

test("la base rechaza datos inválidos, no solo los formularios (R8, R10)", async () => {
  const f = await createFixture(adminUser.client, "INPUT", { employees: 1, handhelds: 1 });
  const duplicate = await call(security.client, "dactivos_create_asset", {
    p_internal_code: `${f.prefix}-hh1`,
    p_serial_number: "SN-OTRO",
    p_category_code: "HANDHELD",
    p_name: "Duplicado en minúsculas",
    p_description: "",
  });
  assert.equal(duplicate.code, "23505", "internal codes are unique regardless of case");

  const badCategory = await call(security.client, "dactivos_create_asset", {
    p_internal_code: `${f.prefix}-X1`,
    p_serial_number: `SN-${f.prefix}-X1`,
    p_category_code: "PRINTER",
    p_name: "Categoría inexistente",
    p_description: "",
  });
  assert.notEqual(badCategory.code, null);

  const shortReason = await call(security.client, "dactivos_return_asset", {
    p_assignment_id: "00000000-0000-4000-8000-000000000000",
    p_condition: "BROKEN",
    p_notes: null,
  });
  assert.notEqual(shortReason.code, null);
});
