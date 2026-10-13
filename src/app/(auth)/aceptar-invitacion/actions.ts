"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(formData: FormData) {
  const token = formData.get("token_hash");
  const type = formData.get("type");
  const confirmed = formData.get("confirm");

  if (
    typeof token !== "string" ||
    token.length < 16 || token.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(token) ||
    type !== "invite" || confirmed !== "yes"
  ) {
    redirect("/login?error=invitation");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: "invite",
  });

  if (error) {
    redirect("/login?error=invitation");
  }

  redirect("/establecer-contrasena");
}
