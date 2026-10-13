/** Contrato de la RPC administrativa; no concede permisos ni contiene secretos. */
export type ManagedUser = {
  id: string;
  email: string | null;
  role: "ADMIN" | "SECURITY" | null;
  is_active: boolean | null;
  email_confirmed: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

export function parseAdminUsers(value: unknown): ManagedUser[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: ManagedUser[] = [];
  for (const item of value) {
    const row = record(item);
    if (!row || typeof row.id !== "string" || !row.id.trim() || seen.has(row.id)) continue;
    seen.add(row.id);
    const role = row.role === "ADMIN" || row.role === "SECURITY" ? row.role : null;
    output.push({
      id: row.id,
      email: typeof row.email === "string" && row.email.trim() ? row.email : null,
      role,
      is_active: typeof row.is_active === "boolean" ? row.is_active : null,
      email_confirmed: row.email_confirmed === true,
      created_at: timestamp(row.created_at),
      last_sign_in_at: timestamp(row.last_sign_in_at),
    });
  }
  return output;
}

export function userStatus(user: ManagedUser): "ACTIVE" | "INACTIVE" | "UNLINKED" {
  if (!user.role || user.is_active === null) return "UNLINKED";
  return user.is_active ? "ACTIVE" : "INACTIVE";
}
