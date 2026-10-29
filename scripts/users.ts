/**
 * Gestión de cuentas desde la terminal, para el primer administrador y para recuperación (FR-12, D7).
 * En el día a día, un administrador invita y gestiona cuentas desde la pantalla Usuarios.
 *
 *   npm run users -- list
 *   npm run users -- create [--role SECURITY|ADMIN]     (SECURITY por defecto)
 *   npm run users -- deactivate <email>
 *   npm run users -- activate <email>
 *   npm run users -- reset-password <email>
 *   npm run create-admin                                (igual que create --role ADMIN)
 *
 * Funciona contra el Supabase local (npm run db:up). Para un proyecto alojado, ver resolveSupabaseTarget.
 * Al crear un ADMIN, ADMIN_EMAIL y ADMIN_PASSWORD pueden venir del entorno.
 * Las contraseñas nunca se imprimen ni se aceptan como argumento.
 */
import { parseArgs } from "node:util";
import { z } from "zod";
import { newPasswordSchema } from "../src/lib/auth/password-policy.ts";
import { askNewPassword, askValid, closePrompt } from "./lib/prompt.ts";
import {
  adminClient,
  findAccountByEmail,
  resolveSupabaseTarget,
  setAccess,
} from "./lib/supabase-admin.ts";

const ROLES = ["SECURITY", "ADMIN"] as const;
type Role = (typeof ROLES)[number];
const ROLE_LABEL: Record<Role, string> = { SECURITY: "Seguridad", ADMIN: "Administrador" };

const emailSchema = z.email("Correo inválido.").max(254).trim().toLowerCase();

const USAGE = `Uso:
  npm run users -- list
  npm run users -- create [--role SECURITY|ADMIN]
  npm run users -- deactivate <correo>
  npm run users -- activate <correo>
  npm run users -- reset-password <correo>`;

type Profile = { user_id: string; role: Role | null; is_active: boolean };

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { role: { type: "string", default: "SECURITY" } },
  });
  const [command, emailArg] = positionals;
  const target = resolveSupabaseTarget();
  const admin = adminClient(target);

  const profileOf = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await admin
      .from("profiles")
      .select("user_id, role, is_active")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`No fue posible leer el perfil (${error.code ?? "sin código"}).`);
    return data as Profile | null;
  };
  const existingAccount = async () => {
    const email = emailSchema.parse(emailArg ?? "");
    const account = await findAccountByEmail(admin, email);
    if (!account) throw new Error(`No existe una cuenta con el correo ${email}.`);
    return account;
  };

  switch (command) {
    case "list": {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 500 });
      if (error) throw new Error(`No fue posible consultar las cuentas: ${error.message}`);
      const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("user_id, role, is_active");
      if (profileError) throw new Error("No fue posible leer los perfiles.");
      const byUser = new Map((profiles as Profile[]).map((p) => [p.user_id, p]));
      const lines = data.users.map((user) => {
        const profile = byUser.get(user.id);
        const access = !profile?.role
          ? "sin perfil"
          : `${ROLE_LABEL[profile.role]} · ${profile.is_active ? "activo" : "INACTIVO"}`;
        return `${user.email} · ${access}`;
      });
      console.log(lines.length ? lines.join("\n") : "No hay cuentas.");
      return;
    }
    case "create": {
      const role = z.enum(ROLES, { error: "El rol debe ser SECURITY o ADMIN." }).parse(values.role);
      const env: Partial<Record<string, string>> = role === "ADMIN" ? process.env : {};
      const email = await askValid(emailSchema, "Correo: ", { envValue: env.ADMIN_EMAIL });
      if (await findAccountByEmail(admin, email)) {
        throw new Error(`Ya existe una cuenta con el correo ${email}.`);
      }
      const password = await askNewPassword(newPasswordSchema, env.ADMIN_PASSWORD);
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`No fue posible crear la cuenta: ${error?.message}`);
      await setAccess(admin, data.user.id, role, true, "Cuenta creada desde la terminal");
      console.log(`Cuenta creada: ${email} · ${ROLE_LABEL[role]} · activo`);
      return;
    }
    case "activate":
    case "deactivate": {
      const account = await existingAccount();
      const profile = await profileOf(account.id);
      if (!profile?.role) throw new Error("La cuenta no tiene perfil de acceso.");
      const active = command === "activate";
      const changed = await setAccess(
        admin,
        account.id,
        profile.role,
        active,
        active ? "Acceso habilitado desde la terminal" : "Acceso deshabilitado desde la terminal",
      );
      console.log(
        changed
          ? `${account.email}: ${active ? "activo" : "INACTIVO"}`
          : `${account.email}: sin cambios`,
      );
      return;
    }
    case "reset-password": {
      const account = await existingAccount();
      const password = await askNewPassword(newPasswordSchema);
      const { error } = await admin.auth.admin.updateUserById(account.id, { password });
      if (error) throw new Error(`No fue posible cambiar la contraseña: ${error.message}`);
      console.log(`Contraseña actualizada para ${account.email}.`);
      return;
    }
    default:
      throw new Error(USAGE);
  }
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? "Datos inválidos.")
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(closePrompt);
