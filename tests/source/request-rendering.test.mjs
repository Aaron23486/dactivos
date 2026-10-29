import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/(dashboard)/layout.tsx", "utf8");
const config = readFileSync("next.config.ts", "utf8");
const permissions = readFileSync("src/lib/auth/require-permission.ts", "utf8");

test("Runtime: layout difiere autenticacion hasta request con connection() (FR-1, R13)", () => {
  assert.match(layout, /import\s*\{\s*connection\s*\}\s*from\s*["']next\/server["']/);
  assert.match(layout, /async function DashboardContent/);
  const connection = layout.indexOf("await connection();");
  const permission = layout.indexOf('await requirePermission("dashboard.read")');
  assert.ok(
    connection > 0 && permission > connection,
    "connection debe ejecutarse antes de Supabase Auth",
  );
});
test("Runtime: limite Suspense sigue protegiendo DashboardContent (FR-1, R13)", () => {
  assert.match(
    layout,
    /<Suspense[\s\S]*?<DashboardContent>\{children\}<\/DashboardContent>[\s\S]*?<\/Suspense>/,
  );
});
test("Runtime: todas las páginas son dinámicas para llevar el nonce de la CSP (NFR-1, D14)", () => {
  assert.doesNotMatch(config, /cacheComponents|partialPrefetching/);
  assert.doesNotMatch(layout, /force-dynamic|force-static|use cache/);
  const root = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(root, /export default async function RootLayout/);
  assert.match(root, /await connection\(\);/);
});
test("Runtime: el proxy envía la CSP con un nonce nuevo en cada solicitud (NFR-1, D14)", () => {
  const proxy = readFileSync("src/proxy.ts", "utf8");
  assert.match(proxy, /const nonce = createNonce\(\);/);
  assert.match(proxy, /"content-security-policy": policy/);
  assert.match(proxy, /response\.headers\.set\("Content-Security-Policy", policy\)/);
});
test("Runtime: autorizacion sigue pasando por la verificacion SSR (FR-1, R13)", () => {
  assert.match(layout, /requirePermission\("dashboard\.read"\)/);
  assert.match(permissions, /supabase\.auth\.getUser\(\)/);
  assert.match(permissions, /rpc\("current_app_role"\)/);
});
