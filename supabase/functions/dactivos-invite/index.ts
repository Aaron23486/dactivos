// Invitation of a new account by an ADMIN. Deployed in the same Supabase project as the database;
// requires the caller's JWT, and the service role key exists only in the Edge Functions environment.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const authorization = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json({ ok: false }, 401);
  const jwt = authorization.replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publicKey || !serviceKey) return json({ ok: false }, 503);
  const caller = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const privileged = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: identity, error: identityError } = await privileged.auth.getUser(jwt);
  if (identityError || !identity.user) return json({ ok: false }, 401);
  const { data: role, error: roleError } = await caller.rpc("current_app_role");
  if (roleError || role !== "ADMIN") return json({ ok: false }, 403);
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return json({ ok: false }, 400);
  const body = payload as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const roleInput = body.role;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    !["ADMIN", "SECURITY"].includes(String(roleInput)) ||
    reason.length < 10 ||
    reason.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(reason) ||
    body.confirm !== "yes"
  )
    return json({ ok: false }, 400);
  // Paso 1: Auth crea identidad e invitación. No se inserta en auth.users directamente.
  const { data: invitation, error: inviteError } =
    await privileged.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invitation.user) return json({ ok: false }, 409);
  // Paso 2: vinculación inactiva y auditoría mediante RPC con JWT del administrador real.
  const { data: linked, error: linkError } = await caller.rpc("dactivos_admin_link_invited_user", {
    p_user_id: invitation.user.id,
    p_role: roleInput,
    p_reason: reason,
  });
  if (linkError || linked !== true) {
    // Auth y la RPC son dos transacciones separadas. La identidad queda sin acceso
    // (current_app_role() devuelve null), pero requiere conciliación administrativa.
    console.error(
      "DACTIVOS invite: perfil pendiente de conciliación",
      linkError?.code ?? "unknown",
    );
    return json({ ok: false, needsReconciliation: true }, 409);
  }
  return json({ ok: true });
});
