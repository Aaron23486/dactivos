"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { OperationResult } from "@/app/actions/operations";

const accessSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["ADMIN", "SECURITY"]),
  active: z.enum(["true", "false"]),
  reason: z
    .string()
    .trim()
    .min(10)
    .max(500)
    .refine(
      (value) => !/[\x00-\x1f\x7f]/.test(value),
      "La justificación no puede contener caracteres de control",
    ),
  confirm: z.literal("yes"),
});

/** Una cuenta Auth sin perfil no se crea aquí. No utilizamos claves privilegiadas. */
export async function setUserAccess(form: FormData): Promise<OperationResult> {
  const actor = await requirePermission("users.manage");
  const validated = accessSchema.safeParse({
    id: form.get("id"),
    role: form.get("role"),
    active: form.get("active"),
    reason: form.get("reason"),
    confirm: form.get("confirm"),
  });
  if (!validated.success) {
    return {
      ok: false,
      message:
        "Completa el rol, estado, confirmación y una justificación válida de 10 a 500 caracteres.",
    };
  }
  const input = validated.data;
  if (actor.id === input.id) {
    return { ok: false, message: "No puedes modificar tu propia cuenta administrativa." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dactivos_admin_set_user_access", {
    p_user_id: input.id,
    p_role: input.role,
    p_is_active: input.active === "true",
    p_reason: input.reason,
  });
  if (error) {
    console.error(`[DACTIVOS] Error administrando acceso (${error.code ?? "sin código"})`);
    if (error.code === "42501")
      return { ok: false, message: "No tienes autorización para modificar cuentas." };
    if (error.code === "23514")
      return {
        ok: false,
        message:
          "Cambio rechazado: cuenta propia, último ADMIN o correo sin confirmar. Revisa las reglas de seguridad.",
      };
    if (error.code === "P0002")
      return {
        ok: false,
        message:
          "El usuario no tiene perfil de acceso. Requiere vinculación mediante un procedimiento independiente.",
      };
    if (error.code === "22023")
      return { ok: false, message: "Los datos o el motivo no cumplen las reglas administrativas." };
    if (error.code === "PGRST202" || error.code === "42883")
      return { ok: false, message: "No está instalada la RPC 07B-2 o su firma no coincide." };
    return {
      ok: false,
      message: "No fue posible actualizar el acceso. Verifica el estado antes de reintentar.",
    };
  }
  if (typeof data !== "boolean") {
    return {
      ok: false,
      message:
        "El servidor devolvió un resultado inesperado. Consulta el estado antes de reintentar.",
    };
  }
  if (!data) return { ok: true, message: "Sin cambios en el usuario." };
  revalidatePath("/usuarios");
  return { ok: true, message: "Acceso actualizado y registrado en auditoría." };
}
