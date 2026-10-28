/** Reportes CSV: BOM UTF-8, separador «;» y celdas que no ejecutan fórmulas (FR-10). */
export const REPORTS = ["assets", "employees", "assignments", "maintenance"] as const;
export type ReportKind = (typeof REPORTS)[number];
export function isReportKind(s: string): s is ReportKind {
  return (REPORTS as readonly string[]).includes(s);
}
const columns: Record<ReportKind, readonly [string, string][]> = {
  assets: [
    ["internal_code", "Código"],
    ["serial_number", "Serie"],
    ["name", "Nombre"],
    ["category_code", "Categoría"],
    ["status", "Estado"],
    ["created_at", "Registro"],
  ],
  employees: [
    ["employee_code", "Código laboral"],
    ["full_name", "Empleado"],
    ["department_code", "Departamento"],
    ["is_active", "Activo"],
    ["created_at", "Registro"],
  ],
  assignments: [
    ["internal_code", "Activo"],
    ["employee_code", "Empleado"],
    ["category_code", "Categoría"],
    ["assigned_at", "Entregado"],
    ["returned_at", "Devuelto"],
    ["return_condition", "Condición"],
  ],
  maintenance: [
    ["internal_code", "Activo"],
    ["status", "Estado"],
    ["opened_at", "Apertura"],
    ["resolved_at", "Resolución"],
    ["description", "Descripción"],
    ["resolution_notes", "Notas de resolución"],
  ],
};
export function csvCell(v: unknown): string {
  let s = v == null ? "" : typeof v === "boolean" ? (v ? "Sí" : "No") : String(v);
  // No permitir inyección de fórmulas en hojas de cálculo.
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function makeCSV(kind: ReportKind, rows: Record<string, unknown>[]): string {
  const cols = columns[kind];
  return (
    "\ufeff" +
    [
      cols.map(([, label]) => csvCell(label)).join(";"),
      ...rows.map((r) => cols.map(([key]) => csvCell(r[key])).join(";")),
    ].join("\r\n") +
    "\r\n"
  );
}
export function keepDate(
  r: Record<string, unknown>,
  kind: ReportKind,
  from: string | null,
  to: string | null,
): boolean {
  if (!from && !to) return true;
  const field =
    kind === "assignments" ? "assigned_at" : kind === "maintenance" ? "opened_at" : "created_at";
  const t = typeof r[field] === "string" ? Date.parse(r[field] as string) : NaN;
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from + "T00:00:00Z")) return false;
  if (to && t >= Date.parse(to + "T00:00:00Z") + 86400000) return false;
  return true;
}
