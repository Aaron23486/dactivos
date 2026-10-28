import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { generateDemoPassword } from "../scripts/lib/demo-password.ts";
import {
  adminClient,
  readLocalSupabase,
  setAccess,
  signedInClient,
} from "../scripts/lib/supabase-admin.ts";
import {
  AUTH_DIR,
  type E2EData,
  dataFile,
  signInThroughForm,
  storageFile,
} from "./tests/support.ts";

/**
 * Prepara cada ejecución: una cuenta por rol, un departamento, dos empleados y dos activos con un
 * prefijo único, y la sesión de cada rol guardada para no iniciar sesión en cada prueba (el
 * límite de intentos de la app es de 10 por minuto, ADR 0010).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const target = readLocalSupabase();
  const admin = adminClient(target);
  const run = `E2E${Date.now().toString(36).toUpperCase()}`;

  const accounts = {} as E2EData["accounts"];
  for (const key of ["ADMIN", "SECURITY", "SIGN_OUT"] as const) {
    const role = key === "ADMIN" ? "ADMIN" : "SECURITY";
    const email = `${run.toLowerCase()}-${key.toLowerCase().replace("_", "-")}@e2e.dactivos.test`;
    const password = generateDemoPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
    await setAccess(admin, data.user.id, role, true, "Cuenta de prueba e2e");
    accounts[key] = { email, password };
  }

  const app = await signedInClient(target, accounts.ADMIN.email, accounts.ADMIN.password);
  const rpc = async (name: string, args: Record<string, unknown> = {}) => {
    const { data, error } = await app.rpc(name, args);
    if (error) throw new Error(`${name}: ${error.message}`);
    return data as Record<string, unknown>[];
  };
  await rpc("dactivos_create_department", { p_code: run, p_name: `Departamento ${run}` });
  const department = (await rpc("dactivos_list_departments")).find((d) => d.code === run)!;
  const employees = [1, 2].map((i) => ({ code: `${run}-E${i}`, name: `Persona E2E ${i}` }));
  for (const e of employees) {
    await rpc("dactivos_create_employee", {
      p_employee_code: e.code,
      p_full_name: e.name,
      p_department_id: department.id,
    });
  }
  const assets = [1, 2].map((i) => ({ code: `${run}-HH${i}`, name: `Zebra E2E ${i}` }));
  for (const a of assets) {
    await rpc("dactivos_create_asset", {
      p_internal_code: a.code,
      p_serial_number: `SN-${a.code}`,
      p_category_code: "HANDHELD",
      p_name: a.name,
      p_description: "",
    });
  }
  await app.auth.signOut();

  mkdirSync(AUTH_DIR, { recursive: true });
  const data: E2EData = { run, accounts, employees, assets };
  writeFileSync(dataFile, JSON.stringify(data, null, 2));

  const baseURL = config.projects[0].use.baseURL!;
  const browser = await chromium.launch({ channel: config.projects[0].use.channel });
  for (const role of ["ADMIN", "SECURITY"] as const) {
    const page = await browser.newPage({ baseURL });
    await signInThroughForm(page, accounts[role]);
    await page.context().storageState({ path: storageFile(role) });
    await page.close();
  }
  await browser.close();
}
