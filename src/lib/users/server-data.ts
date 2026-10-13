import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parseAdminUsers } from "@/lib/users/contracts";

/** Solo se invoca después de requirePermission("users.manage") en el servidor. */
export async function loadAdminUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_admin_list_users");
  if (error) {
    console.error(`[DACTIVOS] dactivos_admin_list_users (${error.code ?? "sin codigo"}): ${error.message}`);
    const message = error.code === "PGRST202" || error.code === "42883"
      ? "Falta instalar la RPC 07B-1 o actualizar la caché de PostgREST."
      : error.code === "42501"
        ? "La cuenta no tiene autorización para consultar usuarios."
        : "No se pudo consultar el directorio. Revisa el registro del servidor.";
    return { users: [], error: message };
  }
  // Un esquema imprevisto debe ser visible, no convertirse silenciosamente en una lista vacía.
  if (!Array.isArray(data)) {
    console.error("[DACTIVOS] RPC usuarios: respuesta de formato inesperado");
    return { users: [], error: "El directorio devolvió un formato inesperado." };
  }
  return { users: parseAdminUsers(data), error: null };
}
