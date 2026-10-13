"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {requirePermission} from "@/lib/auth/require-permission";
import {createClient} from "@/lib/supabase/server";
import type {OperationResult} from "@/app/actions/operations";
const schema=z.object({email:z.email().max(254),role:z.enum(["ADMIN","SECURITY"]),reason:z.string().trim().min(10).max(500).refine(s=>!/[\u0000-\u001f\u007f]/.test(s)),confirm:z.literal("yes")});
export async function inviteUser(form:FormData):Promise<OperationResult>{
 await requirePermission("users.manage");
 const input=schema.safeParse({email:form.get("email"),role:form.get("role"),reason:form.get("reason"),confirm:form.get("confirm")});
 if(!input.success)return {ok:false,message:"Revisa correo, rol, motivo de 10–500 caracteres y confirmación."};
 const supabase=await createClient();
 const {data,error}=await supabase.functions.invoke("dactivos-invite",{body:input.data});
 if(error||!data||data.ok!==true){console.error(`[DACTIVOS] Invite failure ${error?.name??"failed"}`);
  return {ok:false,message:"No se pudo finalizar la invitación. Revisa el despliegue de la Edge Function y el correo en Supabase antes de reintentar."};
 }
 revalidatePath("/usuarios");
 return {ok:true,message:"Invitación enviada. El perfil queda inactivo hasta que el correo sea confirmado y ADMIN habilite el acceso."};
}
