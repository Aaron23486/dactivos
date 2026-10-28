"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginThrottle } from "@/lib/auth/login-throttle";
import { createClient } from "@/lib/supabase/server";

/** Client IP as reported by the proxy in front of the app; "direct" when there is none. */
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
  if (!loginThrottle.allow(await clientIp(), normalizedEmail)) {
    redirect("/login?error=throttled");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    loginThrottle.recordFailure(normalizedEmail);
    redirect("/login?error=credentials");
  }

  loginThrottle.recordSuccess(normalizedEmail);
  redirect("/dashboard");
}
