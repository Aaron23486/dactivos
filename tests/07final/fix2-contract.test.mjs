import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");

test("FIX2: role se extrae de las propiedades de AssetsInventory", () => {
  const ui = read("src/components/assets/assets-inventory.tsx");
  const page = read("src/app/(dashboard)/activos/page.tsx");
  assert.match(
    ui,
    /export function AssetsInventory\(\{\s*assets,\s*categories,\s*assignments,\s*cases,\s*role,\s*error,?\s*\}:/,
  );
  assert.match(ui, /role:\s*AppRole/);
  assert.match(ui, /role\s*===\s*"ADMIN"/);
  assert.match(page, /<AssetsInventory\s+role=\{role\}/);
});

test("FIX2: DO de prevalidacion y funcion guard terminan con punto y coma", () => {
  const sql = read("sql/07_FINAL_INSTALL.sql");
  assert.match(sql, /END;\s*\$pre\$;/);
  assert.match(
    sql,
    /END;\s*\$function\$;\s*CREATE FUNCTION public\.dactivos_admin_change_asset_lifecycle/,
  );
  assert.doesNotMatch(sql, /END\s+\$pre\$;/);
});

test("FIX2: las cadenas delimitadas con dollar-quoting estan equilibradas", () => {
  const sql = read("sql/07_FINAL_INSTALL.sql");
  for (const tag of ["$pre$", "$function$", "$f$"]) {
    const count = sql.split(tag).length - 1;
    assert.equal(count % 2, 0, `${tag} no equilibrado`);
  }
  assert.equal((sql.match(/CREATE FUNCTION public\./g) ?? []).length, 5);
  assert.equal((sql.match(/CREATE OR REPLACE FUNCTION public\./g) ?? []).length, 1);
});

test("FIX2: SQL transaccional y llamadas RPC protegidas", () => {
  const sql = read("sql/07_FINAL_INSTALL.sql");
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.dactivos_admin_report_page\(text,integer,integer\) TO authenticated;/,
  );
  assert.match(sql, /current_app_role\(\) IS DISTINCT FROM 'ADMIN'/);
  assert.match(
    sql,
    /REVOKE ALL ON TABLE public\.asset_lifecycle_log FROM PUBLIC, anon, authenticated;/,
  );
});
