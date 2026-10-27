export const ROLES = ["ADMIN", "SECURITY"] as const;

export type AppRole = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.read",
  "assets.read",
  "assets.create",
  "assets.update",
  "assets.retire",
  "assets.reactivate",
  "departments.read",
  "departments.manage",
  "employees.read",
  "employees.create",
  "employees.update",
  "assignments.read",
  "assignments.create",
  "assignments.return",
  "incidents.read",
  "incidents.create",
  "maintenance.read",
  "maintenance.update",
  "maintenance.validate",
  "history.read",
  "history.correct",
  "reports.export",
  "users.manage",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  ADMIN: PERMISSIONS,

  SECURITY: [
    "dashboard.read",
    "assets.read",
    "assets.create",
    "assets.update",
    "departments.read",
    "employees.read",
    "employees.create",
    "employees.update",
    "assignments.read",
    "assignments.create",
    "assignments.return",
    "incidents.read",
    "incidents.create",
    "maintenance.read",
    "maintenance.update",
    "maintenance.validate",
    "history.read",
  ],
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role || !isAppRole(role)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
