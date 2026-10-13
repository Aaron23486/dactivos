import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  parseAssets, parseCategories, parseDepartments, parseEmployees,
  parseAssignments, parseMaintenance,
} from "@/lib/operations/contracts";

type DbError = {code?: string; message: string};
function publicReadError(source: string, error: DbError | null): string | null {
  if (!error) return null;
  // Registro solo del lado del servidor; no serializar errores SQL al cliente.
  console.error(`[DACTIVOS] RPC ${source} fallo (${error.code ?? "sin codigo"}): ${error.message}`);
  if (error.code === "PGRST202" || error.code === "42883")
    return "No se encontro la RPC en Supabase. Comprueba la migracion y la cache de PostgREST.";
  if (error.code === "42501")
    return "El perfil no tiene permiso para consultar esta informacion.";
  if (error.code === "PGRST301" || error.message.includes("JWT"))
    return "La sesion expiro. Vuelve a iniciar sesion.";
  return "La consulta fallo. Comprueba las funciones, los permisos y el registro del servidor.";
}

export async function loadAssets() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_list_assets");
  return { items: parseAssets(data), error: publicReadError("dactivos_list_assets", error) };
}
export async function loadCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_list_asset_categories");
  return { items: parseCategories(data), error: publicReadError("dactivos_list_asset_categories", error) };
}
export async function loadDepartments() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_list_departments");
  return { items: parseDepartments(data), error: publicReadError("dactivos_list_departments", error) };
}
export async function loadEmployees() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_list_employees");
  return { items: parseEmployees(data), error: publicReadError("dactivos_list_employees", error) };
}
export async function loadAssignments() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_list_assignments");
  return { items: parseAssignments(data), error: publicReadError("dactivos_list_assignments", error) };
}
export async function loadMaintenance() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_list_maintenance_cases");
  return { items: parseMaintenance(data), error: publicReadError("dactivos_list_maintenance_cases", error) };
}
