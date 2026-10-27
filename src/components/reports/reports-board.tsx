"use client";
import { useState } from "react";
import type { ReportKind } from "@/lib/reports/csv";
export function ReportsBoard() {
  const [kind, setKind] = useState<ReportKind>("assets");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const kinds: [ReportKind, string][] = [
    ["assets", "Inventario de activos"],
    ["employees", "Empleados"],
    ["assignments", "Entregas y devoluciones"],
    ["maintenance", "Mantenimiento"],
  ];
  const p = new URLSearchParams({ tipo: kind });
  if (from) p.set("desde", from);
  if (to) p.set("hasta", to);
  const valid = !(from && to && from > to);
  return (
    <main className="max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Solo ADMIN</p>
        <h1 className="mt-1 text-3xl font-bold">Reportes y exportaciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Exporta todos los registros accesibles como CSV UTF-8 compatible con Excel, con protección
          contra fórmulas maliciosas.
        </p>
      </header>
      <section className="space-y-5 rounded-xl border bg-card p-6">
        <label className="block text-sm font-semibold">
          Tipo de reporte
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ReportKind)}
            className="mt-2 block w-full rounded-md border bg-background p-3 font-normal"
          >
            {kinds.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Desde (UTC)
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 block w-full rounded-md border bg-background p-3 font-normal"
            />
          </label>
          <label className="text-sm font-semibold">
            Hasta (UTC)
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 block w-full rounded-md border bg-background p-3 font-normal"
            />
          </label>
        </div>
        {!valid && (
          <p className="text-sm text-destructive" role="alert">
            La fecha inicial debe ser anterior a la final.
          </p>
        )}
        {valid && (
          <a
            href={`/api/reportes?${p.toString()}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Exportar CSV
          </a>
        )}
        <p className="text-xs text-muted-foreground">
          Máximo 10 000 registros por archivo. Si excede el límite, se rechaza la exportación sin
          entregar un archivo incompleto. Los filtros de fecha se evalúan en UTC.
        </p>
      </section>
    </main>
  );
}
