import assert from "node:assert/strict";
import { before, test } from "node:test";
import { admin, call, createUser, type TestUser } from "./support.ts";

// Account administration: in-app RPCs (Usuarios screen) and the terminal-only RPC.

let adminUser: TestUser;

before(async () => {
  adminUser = await createUser("ADMIN");
});

async function lastAudit(targetUserId: string) {
  const { data, error } = await admin
    .from("admin_audit_log")
    .select("event_type, actor_user_id, reason, new_state")
    .eq("target_user_id", targetUserId)
    .order("id", { ascending: false })
    .limit(1)
    .single();
  assert.equal(error, null);
  return data!;
}

test("deactivating an account cuts its access on the next request, and it is audited", async () => {
  const guard = await createUser("SECURITY");
  assert.equal((await call(guard.client, "dactivos_list_assets")).code, null);

  const changed = await call(adminUser.client, "dactivos_admin_set_user_access", {
    p_user_id: guard.id,
    p_role: "SECURITY",
    p_is_active: false,
    p_reason: "Fin de contrato del guarda de prueba.",
  });
  assert.equal(changed.data, true);

  // The session is still valid in Auth, but the role check in every RPC now fails.
  assert.equal((await call(guard.client, "dactivos_list_assets")).code, "42501");

  const audit = await lastAudit(guard.id);
  assert.equal(audit.actor_user_id, adminUser.id);
  assert.equal(audit.reason, "Fin de contrato del guarda de prueba.");
  assert.deepEqual(audit.new_state, { role: "SECURITY", is_active: false });

  // Repeating the same change is a no-op.
  const again = await call(adminUser.client, "dactivos_admin_set_user_access", {
    p_user_id: guard.id,
    p_role: "SECURITY",
    p_is_active: false,
    p_reason: "Fin de contrato del guarda de prueba.",
  });
  assert.equal(again.data, false);
});

test("an administrator cannot change their own account", async () => {
  const result = await call(adminUser.client, "dactivos_admin_set_user_access", {
    p_user_id: adminUser.id,
    p_role: "SECURITY",
    p_is_active: true,
    p_reason: "Intento de autodegradación.",
  });
  assert.equal(result.code, "23514");
});

test("an invited identity is linked once, inactive, and audited with its inviter", async () => {
  const invited = await createUser(null);
  const linked = await call(adminUser.client, "dactivos_admin_link_invited_user", {
    p_user_id: invited.id,
    p_role: "SECURITY",
    p_reason: "Ingreso de personal de seguridad.",
  });
  assert.equal(linked.data, true);
  assert.equal((await call(invited.client, "current_app_role")).data, null, "starts inactive");

  const audit = await lastAudit(invited.id);
  assert.equal(audit.event_type, "USER_INVITED");
  assert.equal(audit.actor_user_id, adminUser.id);

  const twice = await call(adminUser.client, "dactivos_admin_link_invited_user", {
    p_user_id: invited.id,
    p_role: "ADMIN",
    p_reason: "Segundo vínculo no permitido.",
  });
  assert.equal(twice.code, "23505");
});

test("the terminal RPC creates and changes access with an audit entry and no app actor", async () => {
  const account = await createUser(null);
  const { data: created } = await admin.rpc("dactivos_terminal_set_access", {
    p_user_id: account.id,
    p_role: "SECURITY",
    p_is_active: true,
    p_reason: "Alta desde la terminal en prueba.",
  });
  assert.equal(created, true);
  assert.equal((await call(account.client, "current_app_role")).data, "SECURITY");

  const audit = await lastAudit(account.id);
  assert.equal(audit.event_type, "TERMINAL_ACCOUNT_CREATED");
  assert.equal(audit.actor_user_id, null);

  const { error } = await admin.rpc("dactivos_terminal_set_access", {
    p_user_id: account.id,
    p_role: "SECURITY",
    p_is_active: true,
    p_reason: "corto",
  });
  assert.equal(error?.code, "22023", "the reason must have 10 to 500 characters");
});
