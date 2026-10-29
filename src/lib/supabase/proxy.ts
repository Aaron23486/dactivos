import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./config";
import { hardenSessionCookie } from "./cookie-options";

/**
 * Renueva la sesión de Supabase en cada solicitud. `requestHeaders` se agregan a la solicitud que
 * reciben las páginas (por ejemplo la CSP con su nonce, D14).
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders: Record<string, string> = {},
) {
  const { url, publishableKey } = getSupabasePublicConfig();

  // Las cookies renovadas se escriben en request.cookies, que actualiza su cabecera; por eso las
  // cabeceras se copian cada vez que se crea la respuesta.
  const forward = () => {
    const headers = new Headers(request.headers);
    for (const [name, value] of Object.entries(requestHeaders)) headers.set(name, value);
    return NextResponse.next({ request: { headers } });
  };

  let response = forward();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = forward();

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, hardenSessionCookie(options));
        });

        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        }
      },
    },
  });

  // Verifica las credenciales y permite renovar la sesion.
  // No utilizar getSession() como prueba de identidad.
  await supabase.auth.getClaims();

  return response;
}
