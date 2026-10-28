"use server";

import { redirect } from "next/navigation";
import { isFreshInvitationSession } from "@/lib/auth/invitation-session";
import { newPasswordSchema } from "@/lib/auth/password-policy";
import { logSecurityEvent } from "@/lib/security/events";
import { createClient } from "@/lib/supabase/server";

/** Contraseña de una cuenta invitada; queda inactiva hasta que ADMIN la habilite (FR-11, NFR-1). */
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
  // Solo la sesión recién abierta por el enlace de invitación puede fijar la contraseña (SEC-02).
  const { data: session } = await supabase.auth.getClaims();
  if (!isFreshInvitationSession(session?.claims)) {
    logSecurityEvent("auth.invitation_rejected", {
      user: user.id,
      reason: "not_invitation_session",
    });
    redirect("/login?error=invitation");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/establecer-contrasena?error=update");
  }

  await supabase.auth.signOut();
  redirect("/invitacion-completada");
}
