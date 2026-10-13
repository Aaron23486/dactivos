export type AuditEvent = {
  id: string; created_at: string; source: string; operation: string;
  entity: string; reference: string; actor: string | null; reason: string | null;
};
export function parseAuditEvents(value:unknown):AuditEvent[] {
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();
  return value.flatMap((item):AuditEvent[]=>{
    if(!item || typeof item!=="object" || Array.isArray(item))return [];
    const r=item as Record<string,unknown>;
    const str=(k:string)=>typeof r[k]==="string" ? r[k] as string : "";
    const e:AuditEvent={id:str("id"),created_at:str("created_at"),source:str("source"),operation:str("operation"),entity:str("entity"),reference:str("reference"),actor:str("actor")||null,reason:str("reason")||null};
    if(!e.id||!e.source||!Number.isFinite(Date.parse(e.created_at))||seen.has(e.id))return [];
    seen.add(e.id);return [e];
  });
}
