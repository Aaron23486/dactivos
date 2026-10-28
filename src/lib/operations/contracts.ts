/** Contratos de las RPC de inventario: no se fabrican registros ni estados (FR-2–FR-7). */
export type Asset = {
  id: string;
  internal_code: string;
  serial_number: string;
  category_code: string;
  category_name: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};
export type Category = { code: string; name: string; is_active: boolean };
export type Department = { id: string; code: string; name: string; is_active: boolean };
export type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  department_id: string;
  department_code: string;
  department_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type Assignment = {
  id: string;
  asset_id: string;
  asset_name: string;
  internal_code: string;
  category_code: string;
  employee_id: string;
  full_name: string;
  employee_code: string;
  assigned_at: string;
  returned_at: string | null;
  assigned_by: string;
  returned_by: string | null;
  assignment_notes: string | null;
  return_notes: string | null;
  return_condition: string | null;
};
export type MaintenanceCase = {
  id: string;
  asset_id: string;
  asset_name: string;
  internal_code: string;
  asset_status: string;
  status: string;
  description: string;
  source_inspection_id: string | null;
  opened_at: string;
  opened_by: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function optional(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function bool(value: unknown): boolean {
  return value === true;
}
function parseRows<T>(value: unknown, map: (r: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(record)
    .filter((row): row is Record<string, unknown> => row !== null)
    .map(map);
}
export const parseAssets = (data: unknown): Asset[] =>
  parseRows(data, (r) => ({
    id: text(r.id),
    internal_code: text(r.internal_code),
    serial_number: text(r.serial_number),
    category_code: text(r.category_code),
    category_name: text(r.category_name),
    name: text(r.name),
    description: optional(r.description),
    status: text(r.status),
    created_at: text(r.created_at),
    updated_at: text(r.updated_at),
  }));
export const parseCategories = (data: unknown): Category[] =>
  parseRows(data, (r) => ({
    code: text(r.code),
    name: text(r.name),
    is_active: bool(r.is_active),
  }));
export const parseDepartments = (data: unknown): Department[] =>
  parseRows(data, (r) => ({
    id: text(r.id),
    code: text(r.code),
    name: text(r.name),
    is_active: bool(r.is_active),
  }));
export const parseEmployees = (data: unknown): Employee[] =>
  parseRows(data, (r) => ({
    id: text(r.id),
    employee_code: text(r.employee_code),
    full_name: text(r.full_name),
    department_id: text(r.department_id),
    department_code: text(r.department_code),
    department_name: text(r.department_name),
    is_active: bool(r.is_active),
    created_at: text(r.created_at),
    updated_at: text(r.updated_at),
  }));
export const parseAssignments = (data: unknown): Assignment[] =>
  parseRows(data, (r) => ({
    id: text(r.id),
    asset_id: text(r.asset_id),
    asset_name: text(r.asset_name),
    internal_code: text(r.internal_code),
    category_code: text(r.category_code),
    employee_id: text(r.employee_id),
    full_name: text(r.full_name),
    employee_code: text(r.employee_code),
    assigned_at: text(r.assigned_at),
    returned_at: optional(r.returned_at),
    assigned_by: text(r.assigned_by),
    returned_by: optional(r.returned_by),
    assignment_notes: optional(r.assignment_notes),
    return_notes: optional(r.return_notes),
    return_condition: optional(r.return_condition),
  }));
export const parseMaintenance = (data: unknown): MaintenanceCase[] =>
  parseRows(data, (r) => ({
    id: text(r.id),
    asset_id: text(r.asset_id),
    asset_name: text(r.asset_name),
    internal_code: text(r.internal_code),
    asset_status: text(r.asset_status),
    status: text(r.status),
    description: text(r.description),
    source_inspection_id: optional(r.source_inspection_id),
    opened_at: text(r.opened_at),
    opened_by: text(r.opened_by),
    resolved_at: optional(r.resolved_at),
    resolved_by: optional(r.resolved_by),
    resolution_notes: optional(r.resolution_notes),
  }));
export function dateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
export const assetStatus: Record<string, string> = {
  AVAILABLE: "Disponible",
  ASSIGNED: "Asignado",
  MAINTENANCE: "Mantenimiento",
  RETIRED: "Retirado",
};
