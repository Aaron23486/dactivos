"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { parseAssets } from "@/lib/operations/contracts";
import type { Permission } from "@/lib/auth/permissions";

export type OperationResult = { ok: boolean; message: string };

const trim = (value: unknown) => typeof value === "string" ? value.trim() : "";
const token = z.string().trim().min(2).max(60).regex(/^\S+$/, "No se permiten espacios");
const optionalNote = z.string().trim().max(2000);
const uuid = z.string().uuid();
const assetCreate = z.object({
  internal_code:token, serial_number:z.string().trim().min(2).max(120),
  category_code:z.enum(["HANDHELD","COMPUTER"]),
  name:z.string().trim().min(2).max(150), description:optionalNote,
});
const assetUpdate = z.object({ id:uuid, name:z.string().trim().min(2).max(150), description:optionalNote });
const departmentCreate = z.object({
  code: z.string().trim().min(2).max(40).regex(/^\S+$/, "Sin espacios"),
  name: z.string().trim().min(2).max(150),
});
const departmentUpdate = z.object({id:uuid, name:z.string().trim().min(2).max(150)});
const departmentToggle = z.object({id:uuid, active:z.enum(["true","false"])});
const employeeCreate = z.object({
  employee_code:token.max(40), full_name:z.string().trim().min(2).max(150), department_id:uuid,
});
const employeeUpdate = z.object({ id:uuid, full_name:z.string().trim().min(2).max(150), department_id:uuid });
const assignSchema = z.object({ asset_ref:z.string().trim().min(2).max(160), employee_id:uuid, notes:optionalNote });
const returnSchema = z.object({ id:uuid, condition:z.enum(["GOOD","DAMAGED"]), notes:optionalNote });
const resolveSchema = z.object({ id:uuid, notes:z.string().trim().min(10).max(2000) });
const releaseSchema = z.object({ id:uuid, notes:z.string().trim().min(10).max(2000), physical:z.literal("yes") });

type RpcArgs = Record<string, string | boolean | null>;
function cleanError(code?: string, message?: string): string {
  if (code === "23505") return "Ya existe un registro con ese código o número de serie, o el equipo ya fue asignado.";
  if (code === "42501") return "No tienes autorización para realizar esta operación.";
  if (code === "23514") return "La operación incumple una regla de disponibilidad, asignación o mantenimiento. Actualiza la pantalla.";
  if (code === "22023") return "Los datos ingresados no cumplen las validaciones del sistema.";
  if (code === "P0002") return "No se encontró el registro o su estado cambió.";
  if (code === "PGRST202" || code === "42883") return "La función requerida no está instalada o su contrato no coincide. Solicita revisión técnica.";
  if (code === "40P01" || code === "40001") return "Otra operación está procesando este equipo. Revisa su estado antes de volver a intentar.";
  // No exponer detalles internos de la base al cliente.
  return message?.includes("JWT") ? "La sesión expiró. Inicia sesión de nuevo." : "No fue posible completar la operación. Revisa el estado y contacta al administrador si continúa.";
}

async function call(permission: Permission, rpc: string, args: RpcArgs): Promise<OperationResult> {
  await requirePermission(permission);
  const supabase = await createClient();
  const { error } = await supabase.rpc(rpc, args);
  if (error) return { ok:false, message:cleanError(error.code, error.message) };
  for (const path of ["/activos", "/empleados", "/departamentos", "/asignaciones", "/mantenimiento", "/dashboard"]) revalidatePath(path);
  return { ok:true, message:"Operación realizada correctamente." };
}
function values(form: FormData, keys: string[]): Record<string,string> {
  return Object.fromEntries(keys.map(k => [k, trim(form.get(k))]));
}
function validate<T>(result: { success: true; data: T } | { success: false }): T | null {
  return result.success ? result.data : null;
}
const invalid: OperationResult = {ok:false, message:"Revisa los campos: algunos valores están vacíos o exceden los límites permitidos."};

export async function createAsset(form: FormData): Promise<OperationResult> {
  const input = validate(assetCreate.safeParse(values(form,["internal_code","serial_number","category_code","name","description"])));
  if (!input) return invalid;
  return call("assets.create", "dactivos_create_asset", {
    p_internal_code:input.internal_code, p_serial_number:input.serial_number,
    p_category_code:input.category_code, p_name:input.name, p_description:input.description,
  });
}
export async function updateAsset(form: FormData): Promise<OperationResult> {
  const input = validate(assetUpdate.safeParse(values(form,["id","name","description"])));
  if (!input) return invalid;
  return call("assets.update", "dactivos_update_asset", {p_asset_id:input.id,p_name:input.name,p_description:input.description});
}
export async function createEmployee(form: FormData): Promise<OperationResult> {
  const input = validate(employeeCreate.safeParse(values(form,["employee_code","full_name","department_id"])));
  if (!input) return invalid;
  return call("employees.create", "dactivos_create_employee", {
    p_employee_code:input.employee_code,p_full_name:input.full_name,p_department_id:input.department_id,
  });
}
export async function updateEmployee(form: FormData): Promise<OperationResult> {
  const input = validate(employeeUpdate.safeParse(values(form,["id","full_name","department_id"])));
  if (!input) return invalid;
  return call("employees.update", "dactivos_update_employee", {
    p_employee_id:input.id,p_full_name:input.full_name,p_department_id:input.department_id,
  });
}
export async function assignAsset(form: FormData): Promise<OperationResult> {
  const input = validate(assignSchema.safeParse(values(form,["asset_ref","employee_id","notes"])));
  if (!input || form.get("confirm") !== "yes") return invalid;
  await requirePermission("assignments.create");
  // Convertir el código escaneado a ID EN SERVIDOR, nunca confiar en un UUID del navegador.
  const supabase = await createClient();
  const {data,error} = await supabase.rpc("dactivos_list_assets");
  if (error) return {ok:false,message:cleanError(error.code,error.message)};
  const ref = input.asset_ref.toLocaleUpperCase();
  const match = parseAssets(data).filter(a =>
    a.id.toUpperCase() === ref || a.internal_code.toLocaleUpperCase() === ref || a.serial_number.toLocaleUpperCase() === ref
  );
  if (match.length !== 1) return {ok:false,message:"Código o serie no encontrado o ambiguo. Consulta el inventario."};
  return call("assignments.create", "dactivos_assign_asset", {
    p_asset_id:match[0].id,p_employee_id:input.employee_id,p_notes:input.notes || null,
  });
}
export async function returnAsset(form: FormData): Promise<OperationResult> {
  const input = validate(returnSchema.safeParse(values(form,["id","condition","notes"])));
  if (!input || (input.condition === "DAMAGED" && input.notes.length < 10)) return invalid;
  if (form.get("confirm") !== "yes") return {ok:false,message:"Debes confirmar la recepción física del equipo."};
  return call("assignments.return", "dactivos_return_asset", {
    p_assignment_id:input.id,p_condition:input.condition,p_notes:input.notes || null,
  });
}
export async function resolveMaintenance(form: FormData): Promise<OperationResult> {
  const input = validate(resolveSchema.safeParse(values(form,["id","notes"])));
  if (!input || form.get("confirm") !== "yes") return invalid;
  return call("maintenance.update", "dactivos_resolve_maintenance", {
    p_case_id:input.id,p_resolution_notes:input.notes,
  });
}
export async function releaseAsset(form: FormData): Promise<OperationResult> {
  const input = validate(releaseSchema.safeParse(values(form,["id","notes","physical"])));
  if (!input || form.get("confirm") !== "yes") return invalid;
  return call("maintenance.validate", "dactivos_release_asset", {
    p_asset_id:input.id,p_physically_verified:true,p_validation_notes:input.notes,
  });
}


// Gestion de departamentos: ADMIN exclusivamente, verificado tambien por PostgreSQL.
export async function createDepartment(form: FormData): Promise<OperationResult> {
  const input = validate(departmentCreate.safeParse(values(form, ["code","name"])));
  if (!input) return invalid;
  return call("departments.manage", "dactivos_create_department", {
    p_code:input.code, p_name:input.name,
  });
}
export async function updateDepartment(form: FormData): Promise<OperationResult> {
  const input = validate(departmentUpdate.safeParse(values(form,["id","name"])));
  if (!input) return invalid;
  return call("departments.manage", "dactivos_update_department", {
    p_department_id:input.id, p_name:input.name,
  });
}
export async function setDepartmentActive(form: FormData): Promise<OperationResult> {
  const input = validate(departmentToggle.safeParse(values(form,["id","active"])));
  if (!input || form.get("confirm") !== "yes") return invalid;
  return call("departments.manage", "dactivos_set_department_active", {
    p_department_id:input.id, p_is_active:input.active === "true",
  });
}
