"use client";

import { useMemo, useState } from "react";
import type { AppRole } from "@/lib/auth/permissions";
import { createAsset, updateAsset } from "@/app/actions/operations";
import { changeAssetLifecycle } from "@/app/actions/assets-admin";
import type { Asset, Category, Assignment, MaintenanceCase } from "@/lib/operations/contracts";
import { dateTime } from "@/lib/operations/contracts";
import { ActionForm } from "@/components/operations/action-form";
import {
  Metric,
  PageHeader,
  ErrorNotice,
  Status,
  inputClass,
  ScrollRegion,
} from "@/components/operations/primitives";

export function AssetsInventory({
  assets,
  categories,
  assignments,
  cases,
  role,
  error,
}: {
  assets: Asset[];
  categories: Category[];
  assignments: Assignment[] | null;
  cases: MaintenanceCase[] | null;
  role: AppRole;
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [detail, setDetail] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      assets.filter((a) => {
        const text = [a.name, a.internal_code, a.serial_number, a.description ?? ""]
          .join(" ")
          .toLocaleLowerCase();
        return (
          (category === "ALL" || a.category_code === category) &&
          (status === "ALL" || a.status === status) &&
          text.includes(query.toLocaleLowerCase().trim())
        );
      }),
    [assets, query, category, status],
  );
  const selected = assets.find((a) => a.id === detail);
  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Control de inventario"
        title="Activos tecnológicos"
        description="Equipos, disponibilidad y trazabilidad de movimientos."
      >
        {!error && (
          <ActionForm
            title="Registrar equipo"
            trigger="+ Nuevo activo"
            action={createAsset}
            submitLabel="Registrar activo"
            description="El equipo nuevo quedará Disponible; el estado no se selecciona manualmente."
            fields={[
              {
                name: "internal_code",
                label: "Código interno",
                required: true,
                minLength: 2,
                maxLength: 60,
              },
              {
                name: "serial_number",
                label: "Número de serie",
                required: true,
                minLength: 2,
                maxLength: 120,
              },
              {
                name: "category_code",
                label: "Categoría",
                type: "select",
                required: true,
                options: categories
                  .filter((c) => c.is_active)
                  .map((c) => ({ value: c.code, label: c.name })),
              },
              {
                name: "name",
                label: "Nombre del equipo",
                required: true,
                minLength: 2,
                maxLength: 150,
              },
              { name: "description", label: "Descripción", type: "textarea", maxLength: 2000 },
            ]}
          />
        )}
      </PageHeader>
      <ErrorNotice message={error} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total inventariado" value={assets.length} />
        <Metric label="Disponibles" value={assets.filter((a) => a.status === "AVAILABLE").length} />
        <Metric label="Asignados" value={assets.filter((a) => a.status === "ASSIGNED").length} />
        <Metric
          label="Mantenimiento"
          value={assets.filter((a) => a.status === "MAINTENANCE").length}
        />
      </div>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Inventario</h2>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <input
              className={inputClass}
              aria-label="Buscar activos"
              placeholder="Buscar código, serie o equipo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filtrar categoría"
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map((c) => (
                <option value={c.code} key={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filtrar estado"
            >
              <option value="ALL">Todos los estados</option>
              {["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"].map((s) => (
                <option value={s} key={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {rows.length} de {assets.length} equipos
          </p>
        </div>
        <ScrollRegion label="Tabla de activos">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Equipo", "Código", "Serie", "Categoría", "Estado", "Acciones"].map((x) => (
                  <th scope="col" key={x} className="px-4 py-3 font-medium">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!error &&
                rows.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-4 font-medium">{a.name}</td>
                    <td className="px-4 py-4 font-mono text-xs">{a.internal_code}</td>
                    <td className="px-4 py-4 font-mono text-xs">{a.serial_number}</td>
                    <td className="px-4 py-4">{a.category_name || a.category_code}</td>
                    <td className="px-4 py-4">
                      <Status value={a.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border px-3 py-2 text-xs hover:bg-muted"
                          onClick={() => setDetail(a.id)}
                        >
                          Detalle
                        </button>
                        {a.status === "AVAILABLE" && (
                          <ActionForm
                            small
                            trigger="Editar"
                            title="Editar activo"
                            action={updateAsset}
                            hidden={{ id: a.id }}
                            fields={[
                              {
                                name: "name",
                                label: "Nombre",
                                initial: a.name,
                                required: true,
                                minLength: 2,
                                maxLength: 150,
                              },
                              {
                                name: "description",
                                label: "Descripción",
                                type: "textarea",
                                initial: a.description ?? "",
                                maxLength: 2000,
                              },
                            ]}
                          />
                        )}
                        {role === "ADMIN" &&
                          (a.status === "AVAILABLE" || a.status === "RETIRED") && (
                            <ActionForm
                              small
                              trigger={a.status === "AVAILABLE" ? "Dar de baja" : "Reactivar"}
                              title={
                                a.status === "AVAILABLE"
                                  ? "Baja administrativa del activo"
                                  : "Reactivación administrativa del activo"
                              }
                              action={changeAssetLifecycle}
                              hidden={{
                                id: a.id,
                                mode: a.status === "AVAILABLE" ? "retire" : "reactivate",
                              }}
                              submitLabel="Confirmar cambio"
                              fields={[
                                {
                                  name: "reason",
                                  label: "Motivo obligatorio (10–500 caracteres)",
                                  type: "textarea",
                                  required: true,
                                  minLength: 10,
                                  maxLength: 500,
                                },
                                {
                                  name: "confirm",
                                  label: "Confirmo este cambio de estado y su auditoría",
                                  type: "checkbox",
                                  required: true,
                                },
                              ]}
                              warning="Solo ADMIN. Se rechazará si el activo tiene una asignación abierta o mantenimiento pendiente. Este evento quedará auditado."
                            />
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!error && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No encontramos activos para esta búsqueda.
            </p>
          )}
        </ScrollRegion>
      </section>
      {selected && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-detail-heading"
            className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-background p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Ficha del equipo</p>
                <h2 id="asset-detail-heading" className="text-xl font-semibold">
                  {selected.name}
                </h2>
              </div>
              <button
                autoFocus
                onClick={() => setDetail(null)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              {[
                ["Código", selected.internal_code],
                ["Serie", selected.serial_number],
                ["Categoría", selected.category_name],
                ["Estado", selected.status],
                ["Descripción", selected.description || "—"],
                ["Registro", dateTime(selected.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-3 border-b pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-5 font-semibold">Movimientos</h3>
            {assignments ? (
              <div className="mt-2 space-y-2 text-sm">
                {assignments.filter((x) => x.asset_id === selected.id).length === 0
                  ? "Sin movimientos registrados"
                  : assignments
                      .filter((x) => x.asset_id === selected.id)
                      .map((x) => (
                        <p key={x.id} className="rounded-lg bg-muted p-3">
                          {x.full_name} · {dateTime(x.assigned_at)} ·{" "}
                          {x.returned_at
                            ? `Devuelto ${dateTime(x.returned_at)}`
                            : "Entrega vigente"}
                        </p>
                      ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                El historial estará disponible tras instalar las RPC de consulta.
              </p>
            )}
            <h3 className="mt-5 font-semibold">Mantenimiento</h3>
            {cases ? (
              <p className="mt-2 text-sm">
                {cases.filter((c) => c.asset_id === selected.id).length} casos visibles
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                La consulta de casos todavía no está habilitada.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
