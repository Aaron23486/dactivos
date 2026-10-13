import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  isAppRole,
  type AppRole,
  type Permission,
} from "@/lib/auth/permissions";

export type AuthorizedUser = {
  id: string;
  role: AppRole;
};

export async function requirePermission(
  permission: Permission
): Promise<AuthorizedUser> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: role, error: roleError } =
    await supabase.rpc("current_app_role");

  if (roleError || !isAppRole(role)) {
    redirect("/acceso-denegado");
  }

  if (!hasPermission(role, permission)) {
    redirect("/acceso-denegado");
  }

  return {
    id: user.id,
    role,
  };
}
