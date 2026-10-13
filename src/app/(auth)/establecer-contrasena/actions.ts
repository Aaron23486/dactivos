"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setInvitedPassword(formData: FormData) {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");

  if (
    typeof password !== "string" || typeof confirmation !== "string" ||
    password.length < 12 || password.length > 72 || password !== confirmation
  ) {
    redirect("/establecer-contrasena?error=invalid");
  }

  const supabase = await createClient();
  const { data: { user }, error: identityError } = await supabase.auth.getUser();
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
