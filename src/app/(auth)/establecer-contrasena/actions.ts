"use server";

import { redirect } from "next/navigation";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/server";

export async function setInvitedPassword(formData: FormData) {
  const parsed = newPasswordSchema.safeParse(formData.get("password"));
  if (!parsed.success || formData.get("confirmation") !== parsed.data) {
    redirect("/establecer-contrasena?error=invalid");
  }
  const password = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: identityError,
  } = await supabase.auth.getUser();
  if (identityError || !user) {
    redirect("/login?error=invitation");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/establecer-contrasena?error=update");
  }

  await supabase.auth.signOut();
  redirect("/invitacion-completada");
}
