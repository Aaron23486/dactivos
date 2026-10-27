import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const root = process.cwd(),
  read = (p) => readFileSync(path.join(root, p), "utf8");
test("Todas las páginas privadas tienen ejecución dependiente de solicitud", () => {
  for (const p of [
    "dashboard",
    "activos",
    "empleados",
    "departamentos",
    "asignaciones",
    "mantenimiento",
    "usuarios",
    "historial",
    "reportes",
    "configuracion",
  ]) {
    const s = read(`src/app/(dashboard)/${p}/page.tsx`);
    assert.match(s, /await connection\(\)/, p);
  }
});
test("Layout sigue con Suspense y auth dependiente de solicitud", () => {
  const s = read("src/app/(dashboard)/layout.tsx");
  assert.match(s, /await connection\(\)/);
  assert.match(s, /<Suspense/);
});
test("No force-dynamic ni service role Next.js", () => {
  for (const p of [
    "src/app/actions/assets-admin.ts",
    "src/app/actions/invitations.ts",
    "src/app/api/reportes/route.ts",
  ]) {
    const s = read(p);
    assert.doesNotMatch(s, /force-dynamic|service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.admin/);
  }
});
test("Historial filtra por rol en la RPC y no expone datos brutos", () => {
  const s = read("sql/07_FINAL_INSTALL.sql");
  assert.match(s, /dactivos_list_audit_events/);
  assert.match(s, /v_role='ADMIN'/);
  assert.match(s, /a\.status<>'RETIRED'/);
  assert.match(s, /FROM public\.admin_audit_log l WHERE v_role='ADMIN'/);
});
test("Exportación paginada, rol ADMIN, límites y protección CSV", () => {
  const r = read("src/app/api/reportes/route.ts"),
    sql = read("sql/07_FINAL_INSTALL.sql");
  assert.match(r, /requirePermission\("reports\.export"\)/);
  assert.match(r, /max\s*=\s*10000/);
  assert.match(r, /offset\s*\+=\s*limit/);
  assert.match(sql, /dactivos_admin_report_page/);
  assert.match(sql, /LIMIT p_limit OFFSET p_offset/);
  assert.match(read("src/lib/reports/csv.ts"), /\[=\+@-\]/);
});
test("Baja y reactivación ADMIN serializadas y auditadas", () => {
  const sql = read("sql/07_FINAL_INSTALL.sql");
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /current_app_role\(\) IS DISTINCT FROM 'ADMIN'/);
  assert.match(sql, /INSERT INTO public\.asset_lifecycle_log/);
  assert.match(sql, /lifecycle_immutable/);
});
test("No se crean proyectos alternativos ni se incluyen credenciales", () => {
  assert.ok(existsSync(path.join(root, "supabase/functions/dactivos-invite/index.ts")));
  const s = read("supabase/functions/dactivos-invite/index.ts");
  assert.match(s, /privileged\.auth\.admin\.inviteUserByEmail/);
  assert.match(s, /caller\.rpc\("dactivos_admin_link_invited_user"/);
  assert.match(s, /identity\.user/);
});
