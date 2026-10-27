import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8");
const config = readFileSync("next.config.ts", "utf8");
const permissions = readFileSync("src/lib/auth/require-permission.ts", "utf8");

test("Runtime: layout difiere autenticacion hasta request con connection()", () => {
  assert.match(layout, /import\s*\{\s*connection\s*\}\s*from\s*["']next\/server["']/);
  assert.match(layout, /async function DashboardContent/);
  const connection = layout.indexOf("await connection();");
  const permission = layout.indexOf('await requirePermission("dashboard.read")');
  assert.ok(
    connection > 0 && permission > connection,
    "connection debe ejecutarse antes de Supabase Auth",
  );
});
test("Runtime: limite Suspense sigue protegiendo DashboardContent", () => {
  assert.match(
    layout,
    /<Suspense[\s\S]*?<DashboardContent>\{children\}<\/DashboardContent>[\s\S]*?<\/Suspense>/,
  );
});
test("Runtime: Cache Components y Partial Prefetch se preservan", () => {
  assert.match(config, /cacheComponents:\s*true/);
  assert.match(config, /partialPrefetching:\s*true/);
  assert.doesNotMatch(layout, /force-dynamic|force-static|use cache/);
});
test("Runtime: autorizacion sigue pasando por la verificacion SSR", () => {
  assert.match(layout, /requirePermission\("dashboard\.read"\)/);
  assert.match(permissions, /supabase\.auth\.getUser\(\)/);
  assert.match(permissions, /rpc\("current_app_role"\)/);
});
