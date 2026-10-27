import type { Asset, Assignment, Employee, MaintenanceCase } from "@/lib/operations/contracts";

export type DashboardInputs = {
  assets: Asset[] | null;
  assignments: Assignment[] | null;
  cases: MaintenanceCase[] | null;
  employees: Employee[] | null;
};

export type DashboardActivity = {
  id: string;
  label: string;
  detail: string;
  at: string;
  href: "/asignaciones" | "/mantenimiento";
  kind: "assignment" | "return" | "maintenance" | "resolution";
};

export type DashboardSummary = {
  total: number | null;
  available: number | null;
  assigned: number | null;
  maintenance: number | null;
  retired: number | null;
  unknownStatuses: number | null;
  openCases: number | null;
  pendingRelease: number | null;
  activeEmployees: number | null;
  recent: DashboardActivity[] | null;
  limitedData: boolean;
};

function validTimestamp(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

export function summarizeDashboard({
  assets,
  assignments,
  cases,
  employees,
}: DashboardInputs): DashboardSummary {
  const available = assets?.filter((a) => a.status === "AVAILABLE").length ?? null;
  const assigned = assets?.filter((a) => a.status === "ASSIGNED").length ?? null;
  const maintenance = assets?.filter((a) => a.status === "MAINTENANCE").length ?? null;
  const retired = assets?.filter((a) => a.status === "RETIRED").length ?? null;
  const unknownStatuses =
    assets === null ? null : assets.length - (available! + assigned! + maintenance! + retired!);

  let pendingRelease: number | null = null;
  if (assets !== null && assignments !== null && cases !== null) {
    const activeAssignmentIds = new Set(
      assignments.filter((a) => !a.returned_at).map((a) => a.asset_id),
    );
    const openCasesIds = new Set(cases.filter((c) => c.status === "OPEN").map((c) => c.asset_id));
    const resolvedCasesIds = new Set(
      cases.filter((c) => c.status === "RESOLVED").map((c) => c.asset_id),
    );
    pendingRelease = assets.filter(
      (a) =>
        a.status === "MAINTENANCE" &&
        resolvedCasesIds.has(a.id) &&
        !openCasesIds.has(a.id) &&
        !activeAssignmentIds.has(a.id),
    ).length;
  }

  let recent: DashboardActivity[] | null = null;
  if (assignments !== null || cases !== null) {
    const events: DashboardActivity[] = [];
    for (const a of assignments ?? []) {
      const detail = `${a.internal_code} · ${a.full_name}`;
      if (validTimestamp(a.assigned_at)) {
        events.push({
          id: `delivery:${a.id}`,
          label: "Equipo entregado",
          detail,
          at: a.assigned_at,
          href: "/asignaciones",
          kind: "assignment",
        });
      }
      if (validTimestamp(a.returned_at)) {
        events.push({
          id: `return:${a.id}`,
          label: "Devolución registrada",
          detail,
          at: a.returned_at,
          href: "/asignaciones",
          kind: "return",
        });
      }
    }
    for (const c of cases ?? []) {
      const detail = `${c.internal_code} · ${c.asset_name}`;
      if (validTimestamp(c.opened_at)) {
        events.push({
          id: `maintenance:${c.id}`,
          label: "Incidencia registrada",
          detail,
          at: c.opened_at,
          href: "/mantenimiento",
          kind: "maintenance",
        });
      }
      if (c.status === "RESOLVED" && validTimestamp(c.resolved_at)) {
        events.push({
          id: `resolved:${c.id}`,
          label: "Incidencia resuelta",
          detail,
          at: c.resolved_at,
          href: "/mantenimiento",
          kind: "resolution",
        });
      }
    }
    recent = events
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id))
      .slice(0, 8);
  }

  return {
    total: assets?.length ?? null,
    available,
    assigned,
    maintenance,
    retired,
    unknownStatuses,
    openCases: cases?.filter((c) => c.status === "OPEN").length ?? null,
    pendingRelease,
    activeEmployees: employees?.filter((e) => e.is_active === true).length ?? null,
    recent,
    // Las RPC de movimientos y mantenimiento retornan como maximo 500 filas.
    // En ese caso, no presentar los calculos como totales globales.
    limitedData:
      (assignments?.length ?? 0) >= 500 ||
      (cases?.length ?? 0) >= 500 ||
      (assets?.length ?? 0) >= 500,
  };
}
