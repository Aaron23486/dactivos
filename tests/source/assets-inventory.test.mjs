import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");

test("Inventario: el rol llega por propiedades y solo ADMIN ve baja y reactivación", () => {
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
