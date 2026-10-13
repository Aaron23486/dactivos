import Link from "next/link";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/require-permission";
import {connection} from "next/server";
import {loadAssets,loadCategories,loadDepartments} from "@/lib/operations/server-data";
async function ConfigurationContent(){
 await connection();
 await requirePermission("settings.manage");
 const [categories,departments,assets]=await Promise.all([loadCategories(),loadDepartments(),loadAssets()]);
 return <main className="space-y-6"><header><p className="text-xs font-semibold uppercase text-muted-foreground">Administración</p><h1 className="mt-1 text-3xl font-bold">Configuración del sistema</h1><p className="mt-2 text-sm text-muted-foreground">Configuración operativa real, sin parámetros ficticios ni escritura directa sobre la base.</p></header>
 <div className="grid gap-3 md:grid-cols-3">{[["Categorías",categories.error?"No disponible":String(categories.items.length)],["Departamentos activos",departments.error?"No disponible":String(departments.items.filter(d=>d.is_active).length)],["Activos inventariados",assets.error?"No disponible":String(assets.items.length)]].map(([label,value])=><section key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></section>)}</div>
 {(categories.error||departments.error||assets.error)&&<p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">Una consulta falló; algunos indicadores no están disponibles.</p>}
 <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Categorías permitidas</h2><p className="mt-1 text-sm text-muted-foreground">Solo Handhelds y Computadoras. Estado leído desde Supabase.</p><div className="mt-4 flex flex-wrap gap-3">{categories.items.map(c=><div key={c.code} className="rounded-lg border px-4 py-3 text-sm"><strong>{c.name}</strong><span className="ml-3 text-muted-foreground">{c.is_active?"Activa":"Inactiva"}</span></div>)}</div></section>
 <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Control administrativo</h2><p className="mt-1 text-sm text-muted-foreground">Los cambios se realizan desde los módulos correspondientes con permisos y auditoría.</p><div className="mt-4 flex flex-wrap gap-3">{[["Usuarios","/usuarios"],["Departamentos","/departamentos"],["Activos y bajas","/activos"],["Historial","/historial"],["Reportes","/reportes"]].map(([name,path])=><Link className="rounded-lg border px-4 py-2 text-sm hover:bg-muted" key={path} href={path}>{name}</Link>)}</div></section>
 </main>;
}


export default function Page() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm text-muted-foreground">
          Cargando configuración del sistema...
        </p>
      }
    >
      <ConfigurationContent />
    </Suspense>
  );
}
