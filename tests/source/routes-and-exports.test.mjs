import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const root = process.cwd(),
  read = (p) => readFileSync(path.join(root, p), "utf8");
test("Todas las páginas privadas tienen ejecución dependiente de solicitud (R13)", () => {
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
test("Layout sigue con Suspense y auth dependiente de solicitud (R13)", () => {
  const s = read("src/app/(dashboard)/layout.tsx");
  assert.match(s, /await connection\(\)/);
  assert.match(s, /<Suspense/);
});
test("No force-dynamic ni service role Next.js (NFR-1)", () => {
  for (const p of [
    "src/app/actions/assets-admin.ts",
    "src/app/actions/invitations.ts",
    "src/app/api/reportes/route.ts",
  ]) {
    const s = read(p);
    assert.doesNotMatch(s, /force-dynamic|service_role|SUPABASE_SERVICE_ROLE_KEY|auth\.admin/);
  }
});
// Los filtros por rol de las RPC de historial y reportes y la baja auditada los cubre
// tests/integration contra una base real.
test("Exportación paginada, rol ADMIN, límites y protección CSV (FR-10)", () => {
  const r = read("src/app/api/reportes/route.ts");
  assert.match(r, /requirePermission\("reports\.export"\)/);
  assert.match(r, /max\s*=\s*10000/);
  assert.match(r, /offset\s*\+=\s*limit/);
  assert.match(r, /rpc\("dactivos_admin_report_page"/);
  assert.match(read("src/lib/reports/csv.ts"), /\[=\+@-\]/);
});
test("La invitación usa la Edge Function con el JWT del administrador (FR-11, D6)", () => {
  assert.ok(existsSync(path.join(root, "supabase/functions/dactivos-invite/index.ts")));
  const s = read("supabase/functions/dactivos-invite/index.ts");
  assert.match(s, /privileged\.auth\.admin\.inviteUserByEmail/);
  assert.match(s, /caller\.rpc\("dactivos_admin_link_invited_user"/);
  assert.match(s, /identity\.user/);
});
