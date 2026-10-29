import type { NextRequest } from "next/server";
import { contentSecurityPolicy, createNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Un nonce nuevo por solicitud: Next.js lo lee de la cabecera de la solicitud y lo agrega a sus
  // scripts; el navegador recibe la misma política en la respuesta (D14).
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce);
  const response = await updateSession(request, {
    "x-nonce": nonce,
    "content-security-policy": policy,
  });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
