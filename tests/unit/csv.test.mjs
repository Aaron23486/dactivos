import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
import { readFileSync } from "node:fs";
import vm from "node:vm";
const code = ts.transpileModule(readFileSync("src/lib/reports/csv.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
vm.runInNewContext(code, { exports });
test("CSV incluye BOM, escapa separadores y evita formulas (FR-10)", () => {
  const s = exports.makeCSV("assets", [
    {
      internal_code: '=HYPERLINK("evil")',
      serial_number: "A;B",
      name: "Test\nLine",
      category_code: "COMPUTER",
      status: "AVAILABLE",
      created_at: "2026-10-11",
    },
  ]);
  assert.ok(s.startsWith("\ufeff"));
  assert.ok(s.includes("'=HYPERLINK"));
  assert.ok(s.includes('"A;B"'));
  assert.ok(s.includes('"Test\nLine"'));
});
test("Fecha UTC filtra rangos inclusivos correctamente (FR-10)", () => {
  assert.equal(
    exports.keepDate({ created_at: "2026-10-11T23:59:59Z" }, "assets", "2026-10-11", "2026-10-11"),
    true,
  );
  assert.equal(
    exports.keepDate({ created_at: "2026-10-12T00:00:00Z" }, "assets", "2026-10-11", "2026-10-11"),
    false,
  );
});
