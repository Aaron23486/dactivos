import "server-only";
import {createClient} from "@/lib/supabase/server";
import {parseAuditEvents} from "@/lib/history/contracts";
export async function loadAuditEvents(offset:number){
 const supabase=await createClient();
 const {data,error}=await supabase.rpc("dactivos_list_audit_events",{p_limit:100,p_offset:offset});
 if(error){console.error(`[DACTIVOS] Audit RPC: ${error.code??"unknown"}`);return {items:[],error:"No se pudo consultar historial. Revisa la migración 07-FINAL."};}
 return {items:parseAuditEvents(data),error:null};
}
