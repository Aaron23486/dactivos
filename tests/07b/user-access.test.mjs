import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const action=readFileSync("src/app/actions/users.ts","utf8");
const page=readFileSync("src/app/(dashboard)/usuarios/page.tsx","utf8");
const board=readFileSync("src/components/users/admin-users-board.tsx","utf8");
const sql=readFileSync("sql/07B2_INSTALAR_RPC_ADMIN_ACCESO.sql","utf8");

test("Acceso: acción solo del servidor y exige permiso administrativo",()=>{
  assert.match(action,/^[\\s\\S]*["']use server["'];/);
  assert.match(action,/requirePermission\("users\.manage"\)/);
  assert.match(page,/requirePermission\("users\.manage"\)/);
});
test("Acceso: formulario exige confirmación, UUID, rol, estado y motivo",()=>{
  for(const rule of [/z\.string\(\)\.uuid\(\)/,/z\.enum\(\["ADMIN", "SECURITY"\]\)/,/z\.enum\(\["true", "false"\]\)/,/\.min\(10\)\.max\(500\)/,/z\.literal\("yes"\)/]) assert.match(action,rule);
});
test("Acceso: cliente no puede operar cuenta propia",()=>{
  assert.match(action,/actor\.id === input\.id/);
  assert.match(board,/u\.id === actorId/);
});
test("Acceso: RPC usa exactamente los nombres de parámetros SQL",()=>{
  assert.match(action,/rpc\("dactivos_admin_set_user_access"/);
  for(const key of ["p_user_id","p_role","p_is_active","p_reason"]) {
    assert.match(sql,new RegExp(key));assert.match(action,new RegExp(key+":"));
  }
});
test("Acceso: seguridad de identidad y rol antecede cualquier escritura",()=>{
  const auth=sql.indexOf("current_app_role()");
  const update=sql.indexOf("UPDATE public.profiles");
  assert.ok(auth>0 && update>auth);
  assert.match(sql,/p_user_id = v_actor/);
});
test("Acceso: bloqueo transaccional global antes de leer el perfil",()=>{
  const lock=sql.indexOf("pg_advisory_xact_lock(706, 2026)");
  const rowLock=sql.indexOf("FOR UPDATE;",lock);
  const adminCount=sql.indexOf("v_admin_count <= 1");
  assert.ok(lock>0 && rowLock>lock && adminCount>rowLock);
});
test("Acceso: audita después de actualizar en misma transacción",()=>{
  assert.ok(sql.indexOf("INSERT INTO public.admin_audit_log")>sql.indexOf("UPDATE public.profiles"));
  for (const col of ["actor_user_id", "target_user_id", "reason", "previous_state", "new_state"]) assert.match(sql,new RegExp(col));
});
test("Acceso: sin cambios no genera auditoría innecesaria",()=>{
  assert.match(sql,/RETURN false; -- Sin UPDATE/);
});
test("Acceso: RPC protegida; solo authenticated tiene EXECUTE",()=>{
  assert.match(sql,/SECURITY DEFINER/);
  assert.match(sql,/SET search_path TO ''/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.dactivos_admin_set_user_access\(uuid,text,boolean,text\) FROM PUBLIC/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.dactivos_admin_set_user_access\(uuid,text,boolean,text\) TO authenticated/);
});
test("Acceso: nunca usa service_role, supabase.auth.admin ni acceso directo a tablas",()=>{
  for (const code of [action,board,page]) {
    assert.doesNotMatch(code,/SUPABASE_SERVICE_ROLE_KEY|supabase\.auth\.admin|\.from\(["']profiles["']\)/i);
  }
});
test("Acceso: no retorna detalles internos de PostgreSQL al usuario",()=>{
  assert.doesNotMatch(action,/message:\s*error\.message/);
  assert.match(action,/error\.code/);
});
test("Acceso: opciones de edición en 07B-2 solo para perfiles vinculados",()=>{
  assert.match(board,/!u\.role \|\| u\.is_active === null/);
  assert.match(board,/action=\{setUserAccess\}/);
  assert.match(board,/name:"confirm"/);
});
