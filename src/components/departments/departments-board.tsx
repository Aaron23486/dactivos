"use client";

import { useMemo, useState } from "react";
import type { AppRole } from "@/lib/auth/permissions";
import type { Department, Employee } from "@/lib/operations/contracts";
import { createDepartment, updateDepartment, setDepartmentActive } from "@/app/actions/operations";
import { ActionForm } from "@/components/operations/action-form";
import {
  PageHeader,
  Metric,
  ErrorNotice,
  inputClass,
  ScrollRegion,
} from "@/components/operations/primitives";

export function DepartmentsBoard({
  role,
  departments,
  employees,
  error,
}: {
  role: AppRole;
  departments: Department[];
  employees: Employee[] | null;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const admin = role === "ADMIN";
  const rows = useMemo(
    () =>
      departments.filter(
        (d) =>
          (filter === "ALL" || String(d.is_active) === filter) &&
          `${d.code} ${d.name}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [departments, filter, query],
  );
  const counts = useMemo(() => {
    const output = new Map<string, number>();
    for (const e of employees ?? [])
      output.set(e.department_id, (output.get(e.department_id) ?? 0) + 1);
    return output;
  }, [employees]);
  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Organización"
        title="Departamentos"
        description="Catálogo de áreas para clasificar empleados y sus movimientos."
      >
        {admin && !error && (
          <ActionForm
            title="Registrar departamento"
            trigger="+ Nuevo departamento"
            action={createDepartment}
            submitLabel="Crear departamento"
            fields={[
              {
                name: "code",
                label: "Código único",
                required: true,
                minLength: 2,
                maxLength: 40,
                placeholder: "LOG",
              },
              {
                name: "name",
                label: "Nombre",
                required: true,
                minLength: 2,
                maxLength: 150,
                placeholder: "Logística",
              },
            ]}
            warning="El departamento se crea activo. Los códigos no pueden duplicarse."
          />
        )}
      </PageHeader>
      <ErrorNotice message={error} />
      {!error && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Departamentos visibles" value={departments.length} />
            <Metric label="Activos" value={departments.filter((d) => d.is_active).length} />
            <Metric label="Inactivos" value={departments.filter((d) => !d.is_active).length} />
          </div>
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="space-y-3 p-5">
              <h2 className="font-semibold">Directorio de departamentos</h2>
              <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={inputClass}
                  placeholder="Buscar por código o nombre"
                  aria-label="Buscar departamentos"
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={inputClass}
                  aria-label="Filtrar estado de departamentos"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {rows.length} departamentos visibles.{" "}
                {employees
                  ? "El conteo incluye empleados visibles según tu rol."
                  : "No se pudo consultar el conteo de empleados."}
              </p>
            </div>
            <ScrollRegion label="Tabla de departamentos">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {["Código", "Departamento", "Estado", "Empleados visibles", "Acciones"].map(
                      (x) => (
                        <th className="px-4 py-3 font-medium" key={x}>
                          {x}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-4 py-4 font-mono text-xs">{d.code}</td>
                      <td className="px-4 py-4 font-medium">{d.name}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${d.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
                        >
                          {d.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {employees ? (counts.get(d.id) ?? 0) : "—"}
                      </td>
                      <td className="px-4 py-4">
                        {admin ? (
                          <div className="flex flex-wrap gap-2">
                            <ActionForm
                              small
                              title="Editar departamento"
                              trigger="Editar"
                              action={updateDepartment}
                              hidden={{ id: d.id }}
                              fields={[
                                {
                                  name: "name",
                                  label: "Nombre",
                                  initial: d.name,
                                  required: true,
                                  minLength: 2,
                                  maxLength: 150,
                                },
                              ]}
                              warning={`Código fijo: ${d.code}. Los cambios se auditan en PostgreSQL.`}
                            />
                            <ActionForm
                              small
                              title={
                                d.is_active ? "Desactivar departamento" : "Activar departamento"
                              }
                              trigger={d.is_active ? "Desactivar" : "Activar"}
                              action={setDepartmentActive}
                              hidden={{ id: d.id, active: String(!d.is_active) }}
                              fields={[
                                {
                                  name: "confirm",
                                  type: "checkbox",
                                  label: d.is_active
                                    ? "Confirmo que deseo desactivar este departamento"
                                    : "Confirmo que deseo activar este departamento",
                                  required: true,
                                },
                              ]}
                              warning={
                                d.is_active
                                  ? "No se puede desactivar mientras haya empleados activos adscritos. No se borrarán datos ni historial."
                                  : "Volverá a estar disponible para asignar empleados."
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No hay departamentos para los filtros seleccionados.
                </p>
              )}
            </ScrollRegion>
          </section>
        </>
      )}
    </main>
  );
}
