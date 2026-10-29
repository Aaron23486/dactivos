"use client";

import { useMemo, useState } from "react";
import { assignAsset, returnAsset } from "@/app/actions/operations";
import type { Asset, Employee, Assignment } from "@/lib/operations/contracts";
import { dateTime } from "@/lib/operations/contracts";
import { ActionForm } from "@/components/operations/action-form";
import {
  PageHeader,
  Metric,
  ErrorNotice,
  inputClass,
  ScrollRegion,
} from "@/components/operations/primitives";

export function AssignmentsBoard({
  assets,
  employees,
  assignments,
  errors,
}: {
  assets: Asset[];
  employees: Employee[];
  assignments: Assignment[];
  errors: { assets: string | null; employees: string | null; assignments: string | null };
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("OPEN");
  const blocked = Boolean(errors.assets || errors.employees || errors.assignments);
  const rows = useMemo(
    () =>
      assignments.filter(
        (a) =>
          (filter === "ALL" || (filter === "OPEN" ? !a.returned_at : !!a.returned_at)) &&
          [a.full_name, a.employee_code, a.asset_name, a.internal_code]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
      ),
    [assignments, filter, query],
  );
  const open = assignments.filter((a) => !a.returned_at);
  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Control de movimientos"
        title="Entregas y devoluciones"
        description="Equipos asignados, recepción física y trazabilidad."
      >
        {!blocked && (
          <ActionForm
            trigger="+ Entregar equipo"
            title="Registrar entrega"
            submitLabel="Confirmar entrega"
            action={assignAsset}
            description="Escanea el código interno o la serie en el campo de equipo. La validación final ocurre en PostgreSQL."
            fields={[
              {
                name: "asset_ref",
                label: "Código, serie o identificador del equipo",
                required: true,
                minLength: 2,
                maxLength: 160,
                placeholder: "Escanear o escribir el código",
              },
              {
                name: "employee_id",
                label: "Empleado receptor",
                type: "select",
                required: true,
                options: employees
                  .filter((e) => e.is_active)
                  .map((e) => ({ value: e.id, label: `${e.employee_code} · ${e.full_name}` })),
              },
              {
                name: "notes",
                label: "Observaciones (opcional)",
                type: "textarea",
                maxLength: 2000,
              },
              {
                name: "confirm",
                label: "Confirmo la entrega física al empleado",
                type: "checkbox",
                required: true,
              },
            ]}
            warning="Solo se aceptan equipos disponibles. Si otro usuario lo asignó primero, deberás volver a consultar su estado."
          />
        )}
      </PageHeader>
      <ErrorNotice message={errors.assignments || errors.assets || errors.employees} />
      {!blocked && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Entregas abiertas" value={open.length} />
          <Metric
            label="Devoluciones registradas"
            value={assignments.filter((a) => a.returned_at).length}
          />
          <Metric
            label="Equipos disponibles"
            value={assets.filter((a) => a.status === "AVAILABLE").length}
          />
        </div>
      )}
      <section className="rounded-xl border bg-card shadow-sm">
        <div className="space-y-3 p-5">
          <h2 className="font-semibold">Historial de movimientos</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <input
              className={inputClass}
              placeholder="Buscar equipo o empleado"
              aria-label="Buscar movimientos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={inputClass}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtrar movimientos"
            >
              <option value="OPEN">Entregas abiertas</option>
              <option value="CLOSED">Devueltos</option>
              <option value="ALL">Todos</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Hasta 500 movimientos recientes, ordenados por fecha
          </p>
        </div>
        <ScrollRegion label="Tabla de entregas y devoluciones">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Equipo", "Empleado", "Entrega", "Devolución", "Acción"].map((k) => (
                  <th key={k} className="px-4 py-3 font-medium">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!blocked &&
                rows.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-4">
                      <p className="font-medium">{a.asset_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{a.internal_code}</p>
                    </td>
                    <td className="px-4 py-4">{a.full_name}</td>
                    <td className="px-4 py-4 text-xs">{dateTime(a.assigned_at)}</td>
                    <td className="px-4 py-4 text-xs">
                      {a.returned_at ? dateTime(a.returned_at) : "Pendiente"}
                    </td>
                    <td className="px-4 py-4">
                      {!a.returned_at ? (
                        <ActionForm
                          small
                          title="Registrar devolución física"
                          trigger="Recibir equipo"
                          submitLabel="Confirmar devolución"
                          hidden={{ id: a.id }}
                          action={returnAsset}
                          fields={[
                            {
                              name: "condition",
                              label: "Estado físico",
                              type: "select",
                              required: true,
                              options: [
                                { value: "GOOD", label: "Buen estado" },
                                { value: "DAMAGED", label: "Dañado (abrirá mantenimiento)" },
                              ],
                            },
                            {
                              name: "notes",
                              label: "Descripción / daños (mínimo 10 caracteres si está dañado)",
                              type: "textarea",
                              maxLength: 2000,
                            },
                            {
                              name: "confirm",
                              label:
                                "Confirmo que el equipo fue físicamente recibido e inspeccionado",
                              type: "checkbox",
                              required: true,
                            },
                          ]}
                          warning="Si marcas DAÑADO se cerrará la entrega y se abrirá automáticamente un caso de mantenimiento. Esta acción conserva historial."
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Histórico</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!blocked && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Sin movimientos para estos filtros.
            </p>
          )}
        </ScrollRegion>
      </section>
    </main>
  );
}
