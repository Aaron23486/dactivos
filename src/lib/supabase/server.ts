import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  const { url, publishableKey } = getSupabasePublicConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Las cookies se actualizarán mediante el
          // mecanismo de sesión de la capa de proxy.
          // Este cliente no implementa ese mecanismo.
        }
      },
    },
  });
}
