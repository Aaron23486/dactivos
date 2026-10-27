"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { dateTime } from "@/lib/operations/contracts";
import type { AuditEvent } from "@/lib/history/contracts";
export function HistoryBoard({
  events,
  error,
  offset,
}: {
  events: AuditEvent[];
  error: string | null;
  offset: number;
}) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("ALL");
  const visible = useMemo(
    () =>
      events.filter(
        (e) =>
          (source === "ALL" || e.source === source) &&
          [e.entity, e.reference, e.operation, e.actor ?? "", e.reason ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [events, source, search],
  );
  const page = offset / 100 + 1;
  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Trazabilidad</p>
        <h1 className="mt-1 text-3xl font-bold">Historial y auditoría</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ADMIN: historial completo. SECURITY: movimientos operativos autorizados, sin acceso a
          auditoría administrativa.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-destructive">
          {error}
        </p>
      )}
      {!error && (
        <section className="rounded-xl border bg-card">
          <div className="grid gap-3 p-5 md:grid-cols-[1fr_14rem]">
            <input
              aria-label="Buscar en historial"
              placeholder="Buscar entidad, evento, responsable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
            <select
              aria-label="Filtrar origen"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="ALL">Todos los orígenes</option>
              {[...new Set(events.map((x) => x.source))].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {[
                    "Fecha",
                    "Origen",
                    "Operación",
                    "Entidad",
                    "Referencia",
                    "Responsable / motivo",
                  ].map((h) => (
                    <th key={h} className="p-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr className="border-t" key={e.id}>
                    <td className="whitespace-nowrap p-3">{dateTime(e.created_at)}</td>
                    <td className="p-3">{e.source}</td>
                    <td className="p-3">{e.operation}</td>
                    <td className="p-3">{e.entity}</td>
                    <td className="max-w-48 truncate p-3 font-mono text-xs" title={e.reference}>
                      {e.reference}
                    </td>
                    <td className="max-w-72 break-words p-3 text-xs">
                      {e.actor ?? "—"}
                      {e.reason && <p className="text-muted-foreground">{e.reason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && (
            <p className="p-8 text-sm text-muted-foreground">No hay registros para este filtro.</p>
          )}
          <footer className="flex items-center justify-between border-t p-4 text-sm">
            <span>
              {visible.length} eventos · página {page}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/historial?page=${page - 1}`} className="rounded-md border px-3 py-2">
                  Anterior
                </Link>
              )}
              {events.length === 100 && page < 100 && (
                <Link href={`/historial?page=${page + 1}`} className="rounded-md border px-3 py-2">
                  Siguiente
                </Link>
              )}
            </div>
          </footer>
        </section>
      )}
    </main>
  );
}
