/** 06B-3: Revision ESTATICA de los flujos de UI existentes; sin navegador ni Supabase. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const get = (p) => readFileSync(resolve(process.cwd(), p), "utf8");

test("Interfaz: no reintenta automaticamente escritura si falla servidor", () => {
  const content = get("src/components/operations/action-form.tsx");
  assert.match(content, /await action\(fd\)/);
  assert.match(content, /if\s*\(!result\.ok\)/);
  assert.match(content, /setError\(result\.message\)/);
  assert.doesNotMatch(content, /setInterval\s*\(|setTimeout\s*\(\s*\(\)\s*=>\s*action/);
});
test("Interfaz: previene doble envio por estado pendiente y deshabilita submit", () => {
  const content = get("src/components/operations/action-form.tsx");
  assert.match(content, /if\s*\(busy\)\s*return/);
  assert.match(content, /disabled=\{busy\}\s+type="submit"/);
});
test("Interfaz: refresca vistas solo tras exito confirmado", () => {
  const content = get("src/components/operations/action-form.tsx");
  const guard = content.indexOf("if (!result.ok)");
  const refresh = content.indexOf("router.refresh()");
  assert.ok(guard >= 0 && refresh > guard);
});
test("Rutas: no se usa force-dynamic con Cache Components", () => {
  for (const relative of [
    "src/app/(dashboard)/activos/page.tsx",
    "src/app/(dashboard)/asignaciones/page.tsx",
    "src/app/(dashboard)/empleados/page.tsx",
    "src/app/(dashboard)/mantenimiento/page.tsx",
    "src/app/(dashboard)/departamentos/page.tsx",
  ]) {
    assert.doesNotMatch(get(relative), /export\s+const\s+dynamic\s*=/);
  }
});
test("Operaciones: actualizar la vista no se usa como confirmacion de la escritura", () => {
  const content = get("src/app/actions/operations.ts");
  const success = content.indexOf("if (error) return");
  const revalidate = content.indexOf("revalidatePath(path)");
  assert.ok(success >= 0 && revalidate > success);
});
