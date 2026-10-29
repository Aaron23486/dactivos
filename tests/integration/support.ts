/**
 * Preparación compartida de las pruebas de integración. Corren contra el Supabase local
 * (npm run db:up) por las mismas API HTTP que usa la app: Auth, PostgREST y las RPC de la base.
 *
 * Cada ejecución crea sus propias cuentas y registros con un prefijo T… único, así nunca depende
 * de los datos de demostración ni los cambia. `npm run db:reset` deja la base local vacía.
 */
import { randomInt, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateDemoPassword } from "../../scripts/lib/demo-password.ts";
import {
  adminClient,
  readLocalSupabase,
  setAccess,
  signedInClient,
} from "../../scripts/lib/supabase-admin.ts";

export const target = readLocalSupabase();
if (!target.local) throw new Error("Integration tests only run against the local Supabase.");

export const admin = adminClient(target);

/** Único por ejecución: los códigos de departamento solo aceptan A-Z, 0-9 y guiones bajos. */
export const RUN = `T${Date.now().toString(36).toUpperCase()}${randomInt(10_000)}`;

export function anonClient(): SupabaseClient {
  return createClient(target.url, target.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TestUser = { id: string; email: string; client: SupabaseClient };

/** Crea una cuenta de Auth; con un rol, también su perfil (activo salvo que se indique). */
export async function createUser(
  role: "ADMIN" | "SECURITY" | null,
  { active = true }: { active?: boolean } = {},
): Promise<TestUser> {
  const email = `${RUN.toLowerCase()}-${randomUUID().slice(0, 8)}@integration.dactivos.test`;
  const password = generateDemoPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  if (role) await setAccess(admin, data.user.id, role, active, "Cuenta de prueba de integración");
  return { id: data.user.id, email, client: await signedInClient(target, email, password) };
}

export type RpcResult = { data: unknown; code: string | null };

export async function call(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<RpcResult> {
  const { data, error } = await client.rpc(name, args);
  return { data, code: error ? (error.code ?? "unknown") : null };
}

/** Llama una RPC que debe funcionar y devuelve sus datos. */
export async function ok(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name} failed (${error.code}): ${error.message}`);
  return data;
}

type Row = Record<string, unknown>;
const rows = (data: unknown): Row[] => (Array.isArray(data) ? (data as Row[]) : []);

/** Crea un departamento, empleados y activos para una prueba, todos con códigos únicos. */
export async function createFixture(
  client: SupabaseClient,
  name: string,
  { employees = 2, handhelds = 2, computers = 0 } = {},
) {
  const prefix = `${RUN}_${name}`.toUpperCase();
  await ok(client, "dactivos_create_department", { p_code: prefix, p_name: `Prueba ${prefix}` });
  const department = rows(await ok(client, "dactivos_list_departments")).find(
    (d) => d.code === prefix,
  )!;

  for (let i = 1; i <= employees; i++) {
    await ok(client, "dactivos_create_employee", {
      p_employee_code: `${prefix}-E${i}`,
      p_full_name: `Persona de prueba ${i}`,
      p_department_id: department.id,
    });
  }
  const specs = [
    ...Array.from({ length: handhelds }, (_, i) => ({
      code: `${prefix}-HH${i + 1}`,
      cat: "HANDHELD",
    })),
    ...Array.from({ length: computers }, (_, i) => ({
      code: `${prefix}-PC${i + 1}`,
      cat: "COMPUTER",
    })),
  ];
  for (const s of specs) {
    await ok(client, "dactivos_create_asset", {
      p_internal_code: s.code,
      p_serial_number: `SN-${s.code}`,
      p_category_code: s.cat,
      p_name: "Equipo de prueba",
      p_description: "",
    });
  }

  const employeeIds = rows(await ok(client, "dactivos_list_employees"))
    .filter((e) => String(e.employee_code).startsWith(`${prefix}-E`))
    .sort((a, b) => String(a.employee_code).localeCompare(String(b.employee_code)))
    .map((e) => String(e.id));
  const assetIds = new Map(
    rows(await ok(client, "dactivos_list_assets"))
      .filter((a) => String(a.internal_code).startsWith(`${prefix}-`))
      .map((a) => [String(a.internal_code), String(a.id)]),
  );
  return {
    prefix,
    departmentId: String(department.id),
    employeeIds,
    asset: (suffix: string) => assetIds.get(`${prefix}-${suffix}`)!,
  };
}

export async function assetStatus(client: SupabaseClient, assetId: string): Promise<string> {
  const asset = rows(await ok(client, "dactivos_list_assets")).find((a) => a.id === assetId);
  return String(asset?.status);
}

export { rows };
