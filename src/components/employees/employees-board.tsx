"use client";

import { useMemo, useState } from "react";
import type { AppRole } from "@/lib/auth/permissions";
import type { Employee, Department, Assignment } from "@/lib/operations/contracts";
import { dateTime } from "@/lib/operations/contracts";
import { createEmployee, updateEmployee } from "@/app/actions/operations";
import { ActionForm } from "@/components/operations/action-form";
import {
  PageHeader,
  Metric,
  ErrorNotice,
  inputClass,
  ScrollRegion,
} from "@/components/operations/primitives";

export function EmployeesBoard({
  role,
  employees,
  departments,
  assignments,
  error,
}: {
  role: AppRole;
  employees: Employee[];
  departments: Department[];
  assignments: Assignment[] | null;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("ALL");
  const [active, setActive] = useState("ALL");
  const [detail, setDetail] = useState<string | null>(null);
  const availableDepts = departments.filter((d) => d.is_active);
  const rows = useMemo(
    () =>
      employees.filter(
        (e) =>
          (dept === "ALL" || e.department_id === dept) &&
          (active === "ALL" || String(e.is_active) === active) &&
          [e.full_name, e.employee_code, e.department_name]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
      ),
    [employees, dept, active, query],
  );
  const selected = employees.find((e) => e.id === detail);
  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Gestión del personal"
        title="Empleados"
        description="Colaboradores que pueden recibir equipos. No son cuentas de acceso al sistema."
      >
        {!error && availableDepts.length > 0 && (
          <ActionForm
            title="Registrar empleado"
            trigger="+ Nuevo empleado"
            submitLabel="Registrar"
            action={createEmployee}
            fields={[
              {
                name: "employee_code",
                label: "Código laboral",
                minLength: 2,
                maxLength: 40,
                required: true,
              },
              {
                name: "full_name",
                label: "Nombre completo",
                minLength: 2,
                maxLength: 150,
                required: true,
              },
              {
                name: "department_id",
                label: "Departamento",
                type: "select",
                required: true,
                options: availableDepts.map((d) => ({
                  value: d.id,
                  label: `${d.code} · ${d.name}`,
                })),
              },
            ]}
          />
        )}
      </PageHeader>
      <ErrorNotice message={error} />
      {!error && availableDepts.length === 0 && (
        <p className="rounded-lg border p-4 text-sm">
          Todavía no existen departamentos activos. ADMIN debe registrar o activar un departamento
          antes de incorporar empleados.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Personal visible" value={employees.length} />
        <Metric label="Activos" value={employees.filter((e) => e.is_active).length} />
        <Metric label="Inactivos" value={employees.filter((e) => !e.is_active).length} />
      </div>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="space-y-3 p-5">
          <h2 className="font-semibold">Directorio</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_12rem_10rem]">
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar empleados"
              placeholder="Buscar nombre o código"
            />
            <select
              className={inputClass}
              aria-label="Filtrar departamento"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="ALL">Todos los departamentos</option>
              {departments.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              aria-label="Filtrar estado"
              value={active}
              onChange={(e) => setActive(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{rows.length} empleados visibles</p>
        </div>
        <ScrollRegion label="Tabla de empleados">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Código", "Empleado", "Departamento", "Estado", "Acciones"].map((c) => (
                  <th className="px-4 py-3 font-medium" key={c}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-4 font-mono text-xs">{e.employee_code}</td>
                  <td className="px-4 py-4 font-medium">{e.full_name}</td>
                  <td className="px-4 py-4">{e.department_name}</td>
                  <td className="px-4 py-4">{e.is_active ? "Activo" : "Inactivo"}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border px-3 py-2 text-xs"
                        onClick={() => setDetail(e.id)}
                      >
                        Detalle
                      </button>
                      {(e.is_active || role === "ADMIN") && (
                        <ActionForm
                          small
                          title="Editar empleado"
                          trigger="Editar"
                          action={updateEmployee}
                          hidden={{ id: e.id }}
                          fields={[
                            {
                              name: "full_name",
                              label: "Nombre completo",
                              initial: e.full_name,
                              minLength: 2,
                              maxLength: 150,
                              required: true,
                            },
                            {
                              name: "department_id",
                              label: "Departamento activo",
                              type: "select",
                              initial: e.department_id,
                              required: true,
                              options: departments
                                .filter((d) => d.is_active || d.id === e.department_id)
                                .map((d) => ({
                                  value: d.id,
                                  label: d.is_active
                                    ? d.name
                                    : `${d.name} (inactivo · solo para conservar)`,
                                })),
                            },
                          ]}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No hay empleados que coincidan con los filtros.
            </p>
          )}
        </ScrollRegion>
      </section>
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-detail-heading"
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-background p-6"
          >
            <div className="flex justify-between gap-3">
              <h2 id="employee-detail-heading" className="text-xl font-semibold">
                {selected.full_name}
              </h2>
              <button
                autoFocus
                className="rounded-lg border px-3 py-1 text-sm"
                onClick={() => setDetail(null)}
              >
                Cerrar
              </button>
            </div>
            <p className="mt-2 text-sm">
              Código: {selected.employee_code} · {selected.department_name}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Registrado: {dateTime(selected.created_at)}
            </p>
            <h3 className="mt-5 font-semibold">Equipos y movimientos</h3>
            {assignments ? (
              <div className="mt-2 space-y-2 text-sm">
                {assignments.filter((x) => x.employee_id === selected.id).length === 0
                  ? "Sin movimientos registrados"
                  : assignments
                      .filter((x) => x.employee_id === selected.id)
                      .map((x) => (
                        <p key={x.id} className="rounded-lg bg-muted p-3">
                          {x.asset_name} · {x.internal_code} ·{" "}
                          {x.returned_at ? `Devuelto ${dateTime(x.returned_at)}` : "En posesión"}
                        </p>
                      ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                El historial necesita la migración de consultas seguras.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
