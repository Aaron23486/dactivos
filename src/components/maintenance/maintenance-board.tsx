"use client";

import {useMemo,useState} from "react";
import type {MaintenanceCase,Asset,Assignment} from "@/lib/operations/contracts";
import {dateTime} from "@/lib/operations/contracts";
import {resolveMaintenance,releaseAsset} from "@/app/actions/operations";
import {ActionForm} from "@/components/operations/action-form";
import {PageHeader,Metric,ErrorNotice,Status,inputClass} from "@/components/operations/primitives";

export function MaintenanceBoard({cases,assets,assignments,errors}:{cases:MaintenanceCase[],assets:Asset[],assignments:Assignment[]|null,errors:{cases:string|null,assets:string|null}}){
  const [query,setQuery]=useState("");const [filter,setFilter]=useState("OPEN");
  const blocked=Boolean(errors.cases||errors.assets);
  const rows=useMemo(()=>cases.filter(c=>(filter==="ALL"||c.status===filter)&&[c.asset_name,c.internal_code,c.description].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase())),[cases,query,filter]);
  const pending=cases.filter(c=>c.status==="OPEN");
  const releasable=assets.filter(a=>a.status==="MAINTENANCE" && cases.some(c=>c.asset_id===a.id && c.status==="RESOLVED") && !cases.some(c=>c.asset_id===a.id && c.status==="OPEN") && (assignments ? !assignments.some(x=>x.asset_id===a.id&&!x.returned_at):false));
  return <main className="space-y-6">
    <PageHeader eyebrow="Control técnico" title="Mantenimiento" description="Reparaciones, casos pendientes e inspecciones físicas antes de liberar equipos.">
      {!blocked&&assignments&&releasable.length>0&&<ActionForm trigger="Liberar equipo reparado" title="Validación física y liberación" submitLabel="Liberar equipo" action={releaseAsset} fields={[
        {name:"id",label:"Equipo en mantenimiento",type:"select",required:true,options:releasable.map(a=>({value:a.id,label:`${a.internal_code} · ${a.name}`}))},
        {name:"notes",label:"Resultado de inspección física",type:"textarea",required:true,minLength:10,maxLength:2000},
        {name:"physical",label:"He inspeccionado físicamente el equipo y confirmo que es apto para uso",type:"checkbox",required:true},
        {name:"confirm",label:"Confirmo que deseo liberar este activo y registrar una validación irreversible",type:"checkbox",required:true},
      ]} warning="Solo se liberará si PostgreSQL confirma que no existen casos abiertos ni asignaciones vigentes."/>}
    </PageHeader>
    <ErrorNotice message={errors.cases||errors.assets}/>
    {!blocked&&<div className="grid gap-3 sm:grid-cols-3"><Metric label="Casos abiertos" value={pending.length}/><Metric label="Casos resueltos" value={cases.filter(c=>c.status==="RESOLVED").length}/><Metric label="Equipos en mantenimiento" value={assets.filter(a=>a.status==="MAINTENANCE").length}/></div>}
    <section className="rounded-xl border bg-card shadow-sm"><div className="space-y-3 p-5"><h2 className="font-semibold">Historial de incidencias</h2><p className="text-xs text-muted-foreground">Los casos por devolución dañada se generan automáticamente. Una reparación resuelta no libera el equipo.</p><div className="grid gap-3 sm:grid-cols-[1fr_12rem]"><input className={inputClass} aria-label="Buscar casos" placeholder="Código, equipo o daño" value={query} onChange={e=>setQuery(e.target.value)}/><select className={inputClass} aria-label="Filtrar casos" value={filter} onChange={e=>setFilter(e.target.value)}><option value="OPEN">Abiertos</option><option value="RESOLVED">Resueltos</option><option value="ALL">Todos</option></select></div><p className="text-xs text-muted-foreground">Últimos 500 casos, ordenados por fecha</p></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-muted/40"><tr>{["Activo","Incidencia","Apertura","Estado","Acción"].map(t=><th key={t} className="px-4 py-3 font-medium">{t}</th>)}</tr></thead><tbody>{!blocked&&rows.map(c=><tr className="border-t" key={c.id}><td className="px-4 py-4"><p className="font-semibold">{c.asset_name}</p><p className="font-mono text-xs text-muted-foreground">{c.internal_code}</p></td><td className="max-w-xs px-4 py-4 text-sm"><p className="line-clamp-3">{c.description}</p>{c.resolution_notes&&<p className="mt-1 text-xs text-muted-foreground">Resolución: {c.resolution_notes}</p>}</td><td className="px-4 py-4 text-xs">{dateTime(c.opened_at)}</td><td className="px-4 py-4"><Status value={c.status}/></td><td className="px-4 py-4">{c.status==="OPEN"&&c.asset_status==="MAINTENANCE"?<ActionForm small title="Resolver incidencia" trigger="Resolver" submitLabel="Registrar resolución" action={resolveMaintenance} hidden={{id:c.id}} fields={[
        {name:"notes",label:"Intervención y resultado",type:"textarea",required:true,minLength:10,maxLength:2000},
        {name:"confirm",label:"Confirmo que esta incidencia ha sido resuelta",type:"checkbox",required:true},
      ]} warning="Resolver el caso NO libera el equipo. Luego se requiere inspección física."/>:<span className="text-xs text-muted-foreground">Sin acción disponible</span>}</td></tr>)}</tbody></table>{!blocked&&rows.length===0&&<p className="p-8 text-center text-sm text-muted-foreground">No se encontraron casos con estos filtros.</p>}</div></section>
  </main>;
}
