"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginThrottle } from "@/lib/auth/login-throttle";
import { emailFingerprint, logSecurityEvent } from "@/lib/security/events";
import { createClient } from "@/lib/supabase/server";

/** IP del cliente según el proxy delante de la app; «direct» cuando no hay proxy. */
async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "direct";
}

/** Inicio de sesión con mensajes genéricos y límites por IP y por correo (NFR-1, D10). */
export async function signIn(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 1024 ||
    !email.includes("@") ||
    password.length === 0
  ) {
    redirect("/login?error=credentials");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ip = await clientIp();
  if (!loginThrottle.allow(ip, normalizedEmail)) {
    logSecurityEvent("auth.sign_in_throttled", { email: emailFingerprint(normalizedEmail), ip });
    redirect("/login?error=throttled");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    loginThrottle.recordFailure(normalizedEmail);
    logSecurityEvent("auth.sign_in_failed", { email: emailFingerprint(normalizedEmail), ip });
    redirect("/login?error=credentials");
  }

  loginThrottle.recordSuccess(normalizedEmail);
  redirect("/dashboard");
}
