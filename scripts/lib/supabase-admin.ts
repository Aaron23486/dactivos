import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseTarget = {
  url: string;
  publishableKey: string;
  secretKey: string;
  local: boolean;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isLocalUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Lee la URL y las claves del Supabase local iniciado con `npm run db:up`. Las genera la CLI de
 * Supabase para este equipo, así que nunca hay que copiarlas a mano en un archivo.
 */
export function readLocalSupabase(): SupabaseTarget {
  let output: string;
  try {
    output = execFileSync("npx", ["--no-install", "supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
  } catch {
    throw new Error("Supabase local no está en marcha. Ejecuta primero: npm run db:up");
  }
  const status = JSON.parse(output.slice(output.indexOf("{"))) as Record<string, string>;
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !secretKey) {
    throw new Error("La salida de `supabase status` no contiene la URL y las claves esperadas.");
  }
  return { url, publishableKey, secretKey, local: true };
}

/**
 * Supabase local por defecto. Para un proyecto alojado se definen SUPABASE_URL,
 * SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY en el entorno de la terminal que ejecuta el
 * comando; la clave secreta nunca se lee de .env.local, que carga la app web.
 */
export function resolveSupabaseTarget(): SupabaseTarget {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY } = process.env;
  if (SUPABASE_URL || SUPABASE_SECRET_KEY) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SECRET_KEY) {
      throw new Error(
        "Para un proyecto remoto define SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY y SUPABASE_SECRET_KEY.",
      );
    }
    return {
      url: SUPABASE_URL,
      publishableKey: SUPABASE_PUBLISHABLE_KEY,
      secretKey: SUPABASE_SECRET_KEY,
      local: isLocalUrl(SUPABASE_URL),
    };
  }
  return readLocalSupabase();
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Cliente de servidor con la clave secreta: API de administración de Auth y RPC solo de servicio. */
export function adminClient(target: SupabaseTarget): SupabaseClient {
  return createClient(target.url, target.secretKey, clientOptions);
}

/** Cliente que actúa como un usuario con sesión, así cada cambio pasa por las RPC de la app. */
export async function signedInClient(
  target: SupabaseTarget,
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(target.url, target.publishableKey, clientOptions);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No fue posible iniciar sesión como ${email}: ${error.message}`);
  return client;
}

export type AuthAccount = { id: string; email: string };

/** Busca una cuenta de Auth por correo (la API de administración lista por páginas). */
export async function findAccountByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<AuthAccount | null> {
  const wanted = email.toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`No fue posible consultar las cuentas: ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === wanted);
    if (match) return { id: match.id, email: match.email ?? email };
    if (data.users.length < 200) return null;
  }
}

/** Fija rol y estado con la RPC auditada solo de servicio (ver la migración de terminal). */
export async function setAccess(
  admin: SupabaseClient,
  userId: string,
  role: "ADMIN" | "SECURITY",
  isActive: boolean,
  reason: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("dactivos_terminal_set_access", {
    p_user_id: userId,
    p_role: role,
    p_is_active: isActive,
    p_reason: reason,
  });
  if (error) {
    if (error.code === "23514") throw new Error("No se puede retirar el último ADMIN activo.");
    throw new Error(`No fue posible actualizar el acceso (${error.code ?? "sin código"}).`);
  }
  return data === true;
}
