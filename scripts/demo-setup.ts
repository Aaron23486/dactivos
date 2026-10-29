/**
 * Acceso de demostración para una evaluación local: `npm run demo:setup` (FR-14, D8).
 *
 * - Crea (o reactiva) una cuenta por rol con una contraseña generada que se muestra una sola vez.
 *   Al ejecutarlo de nuevo emite contraseñas nuevas.
 * - Crea departamentos, empleados y activos ficticios, con entregas, devoluciones, un caso de
 *   mantenimiento y una baja, solo la primera vez. Todo pasa por las RPC de la app con la sesión del
 *   administrador de demostración, así se aplican las validaciones y la auditoría de siempre.
 * - Se niega a ejecutarse contra algo que no sea el Supabase local.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseAssets,
  parseAssignments,
  parseDepartments,
  parseEmployees,
  parseMaintenance,
} from "../src/lib/operations/contracts.ts";
import {
  DEMO_ASSETS,
  DEMO_ASSIGNMENTS,
  DEMO_DEPARTMENTS,
  DEMO_EMPLOYEES,
  DEMO_RESOLVED_ASSET,
  DEMO_RETIRED_ASSET,
  DEMO_RETURNS,
} from "./lib/demo-data.ts";
import { generateDemoPassword } from "./lib/demo-password.ts";
import {
  adminClient,
  findAccountByEmail,
  resolveSupabaseTarget,
  setAccess,
  signedInClient,
} from "./lib/supabase-admin.ts";

export const DEMO_ACCOUNTS = [
  { email: "admin@demo.dactivos.test", role: "ADMIN" },
  { email: "seguridad@demo.dactivos.test", role: "SECURITY" },
] as const;

async function rpc(client: SupabaseClient, name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} falló (${error.code ?? "sin código"}): ${error.message}`);
  return data as unknown;
}

async function upsertAccount(
  admin: SupabaseClient,
  email: string,
  role: "ADMIN" | "SECURITY",
  password: string,
) {
  const existing = await findAccountByEmail(admin, email);
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, { password })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (result.error || !result.data.user) {
    throw new Error(`No fue posible preparar ${email}: ${result.error?.message}`);
  }
  await setAccess(admin, result.data.user.id, role, true, "Cuenta de demostración local");
}

async function createDemoData(app: SupabaseClient): Promise<void> {
  for (const d of DEMO_DEPARTMENTS) {
    await rpc(app, "dactivos_create_department", { p_code: d.code, p_name: d.name });
  }
  const departments = parseDepartments(await rpc(app, "dactivos_list_departments"));
  const departmentId = (code: string) => departments.find((d) => d.code === code)!.id;

  for (const e of DEMO_EMPLOYEES) {
    await rpc(app, "dactivos_create_employee", {
      p_employee_code: e.code,
      p_full_name: e.name,
      p_department_id: departmentId(e.department),
    });
  }
  for (const a of DEMO_ASSETS) {
    await rpc(app, "dactivos_create_asset", {
      p_internal_code: a.code,
      p_serial_number: a.serial,
      p_category_code: a.category,
      p_name: a.name,
      p_description: "",
    });
  }

  const employees = parseEmployees(await rpc(app, "dactivos_list_employees"));
  const assets = parseAssets(await rpc(app, "dactivos_list_assets"));
  const assetId = (code: string) => assets.find((a) => a.internal_code === code)!.id;
  const employeeId = (code: string) => employees.find((e) => e.employee_code === code)!.id;

  for (const [asset, employee] of DEMO_ASSIGNMENTS) {
    await rpc(app, "dactivos_assign_asset", {
      p_asset_id: assetId(asset),
      p_employee_id: employeeId(employee),
      p_notes: "Entrega inicial de demostración.",
    });
  }

  const assignments = parseAssignments(await rpc(app, "dactivos_list_assignments"));
  for (const r of DEMO_RETURNS) {
    const open = assignments.find((a) => a.internal_code === r.asset && !a.returned_at)!;
    await rpc(app, "dactivos_return_asset", {
      p_assignment_id: open.id,
      p_condition: r.condition,
      p_notes: r.notes,
    });
  }

  const cases = parseMaintenance(await rpc(app, "dactivos_list_maintenance_cases"));
  const resolved = cases.find(
    (c) => c.internal_code === DEMO_RESOLVED_ASSET && c.status === "OPEN",
  );
  if (resolved) {
    await rpc(app, "dactivos_resolve_maintenance", {
      p_case_id: resolved.id,
      p_resolution_notes: "Se reemplazó la fuente de poder y se probó durante una hora.",
    });
    await rpc(app, "dactivos_release_asset", {
      p_asset_id: assetId(DEMO_RESOLVED_ASSET),
      p_physically_verified: true,
      p_validation_notes: "Equipo revisado en sitio; enciende y conecta a la red.",
    });
  }

  await rpc(app, "dactivos_admin_change_asset_lifecycle", {
    p_asset_id: assetId(DEMO_RETIRED_ASSET),
    p_reactivate: false,
    p_reason: "Equipo fuera de soporte del fabricante; se retira del inventario.",
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("demo:setup no se ejecuta con NODE_ENV=production.");
  }
  const target = resolveSupabaseTarget();
  if (!target.local) {
    throw new Error("demo:setup solo se ejecuta contra el Supabase local (npm run db:up).");
  }
  const admin = adminClient(target);

  const credentials = DEMO_ACCOUNTS.map((account) => ({
    ...account,
    password: generateDemoPassword(),
  }));
  for (const c of credentials) await upsertAccount(admin, c.email, c.role, c.password);

  const demoAdmin = credentials.find((c) => c.role === "ADMIN")!;
  const app = await signedInClient(target, demoAdmin.email, demoAdmin.password);
  const existing = parseAssets(await rpc(app, "dactivos_list_assets"));
  const dataCreated = !existing.some((a) => a.internal_code.startsWith("DEMO-"));
  if (dataCreated) await createDemoData(app);
  await app.auth.signOut();

  console.log("\nCuentas de demostración (las contraseñas se muestran solo esta vez):\n");
  for (const c of credentials) {
    console.log(`  ${c.role.padEnd(8)}  ${c.email.padEnd(30)}  ${c.password}`);
  }
  console.log(
    dataCreated
      ? `\nDatos ficticios creados: ${DEMO_DEPARTMENTS.length} departamentos, ${DEMO_EMPLOYEES.length} empleados, ${DEMO_ASSETS.length} activos, entregas, devoluciones, mantenimiento y una baja.`
      : "\nLos datos ficticios ya existían; solo se renovaron las contraseñas.",
  );
  console.log("Inicia la app con `npm run dev` y entra en http://localhost:3000\n");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
