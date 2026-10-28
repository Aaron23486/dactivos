import type { CookieOptions } from "@supabase/ssr";

/** Vida máxima de la cookie de sesión: la misma que el tiempo máximo de sesión de Auth (D12). */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;

/**
 * Opciones de la cookie de sesión de Supabase (NFR-1, D12). El navegador nunca usa Supabase, así que
 * la cookie no tiene por qué ser legible desde JavaScript: `httpOnly`, `Secure` en producción y
 * `SameSite=Lax`. `@supabase/ssr` fija 400 días de vida; aquí se acota, sin tocar el borrado
 * (`maxAge: 0`).
 */
export function hardenSessionCookie(options: CookieOptions = {}): CookieOptions {
  const deleting = options.maxAge === 0;
  return {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: options.path ?? "/",
    ...(deleting ? {} : { maxAge: SESSION_COOKIE_MAX_AGE_SECONDS }),
  };
}
