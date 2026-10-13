"use server";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {requirePermission} from "@/lib/auth/require-permission";
import {createClient} from "@/lib/supabase/server";
import type {OperationResult} from "@/app/actions/operations";
const schema=z.object({id:z.string().uuid(),mode:z.enum(["retire","reactivate"]),reason:z.string().trim().min(10).max(500).refine(s=>!/[\u0000-\u001f\u007f]/.test(s)),confirm:z.literal("yes")});
export async function changeAssetLifecycle(form:FormData):Promise<OperationResult>{
 await requirePermission("assets.retire");
 const input=schema.safeParse({id:form.get("id"),mode:form.get("mode"),reason:form.get("reason"),confirm:form.get("confirm")});
 if(!input.success)return {ok:false,message:"Confirma la operación y escribe un motivo válido de 10–500 caracteres."};
 await requirePermission(input.data.mode==="retire"?"assets.retire":"assets.reactivate");
 const supabase=await createClient();const {data,error}=await supabase.rpc("dactivos_admin_change_asset_lifecycle",{
  p_asset_id:input.data.id,p_reactivate:input.data.mode==="reactivate",p_reason:input.data.reason,
 });
 if(error){console.error(`[DACTIVOS] Lifecycle error ${error.code??"unknown"}`);
  if(error.code==="42501")return {ok:false,message:"Operación reservada a ADMIN."};
  if(error.code==="23514")return {ok:false,message:"Estado incompatible, entrega vigente o mantenimiento pendiente. Actualiza la página."};
  if(error.code==="PGRST202"||error.code==="42883")return {ok:false,message:"Falta la migración RPC 07-FINAL."};
  return {ok:false,message:"No fue posible cambiar el estado. Revisa el inventario antes de volver a intentar."};
 }
 if(typeof data!=="boolean")return {ok:false,message:"Respuesta inesperada. Consulta el inventario."};
 if(!data)return {ok:true,message:"El activo ya tenía el estado solicitado."};
 for(const path of ["/activos","/dashboard","/historial","/configuracion"])revalidatePath(path);
 return {ok:true,message:"Cambio de estado confirmado y auditado."};
}
