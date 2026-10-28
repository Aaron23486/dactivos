import test from "node:test";
import assert from "node:assert/strict";
import { loadLocalTs } from "../helpers/load-ts.mjs";

const c = loadLocalTs("src/lib/operations/contracts.ts");

test("Contratos: respuesta nula no fabrica registros (FR-2–FR-7)", () => {
  for (const parse of [
    c.parseAssets,
    c.parseDepartments,
    c.parseEmployees,
    c.parseAssignments,
    c.parseMaintenance,
  ]) {
    assert.deepEqual(Array.from(parse(null)), []);
    assert.deepEqual(Array.from(parse({ data: [] })), []);
  }
});
test("Contratos: lista de activos conserva identificadores y estados reales (FR-2–FR-7)", () => {
  const items = c.parseAssets([
    {
      id: "a1",
      internal_code: "QA01",
      serial_number: "SN01",
      category_code: "HANDHELD",
      status: "ASSIGNED",
      name: "Escaner",
      description: null,
    },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].internal_code, "QA01");
  assert.equal(items[0].status, "ASSIGNED");
  assert.equal(items[0].description, null);
});
test("Contratos: booleanos requieren true real, no string (FR-2–FR-7)", () => {
  const [a, b] = c.parseDepartments([
    { id: "1", is_active: "true" },
    { id: "2", is_active: true },
  ]);
  assert.equal(a.is_active, false);
  assert.equal(b.is_active, true);
});
test("Contratos: devoluciones distinguen abiertas y cerradas (FR-2–FR-7)", () => {
  const [open, closed] = c.parseAssignments([
    { id: "1", returned_at: null },
    { id: "2", returned_at: "2026-10-10T10:00:00Z", return_condition: "DAMAGED" },
  ]);
  assert.equal(open.returned_at, null);
  assert.equal(closed.return_condition, "DAMAGED");
});
test("Contratos: casos de mantenimiento conservan estado sin liberacion implicita (FR-2–FR-7)", () => {
  const [caseItem] = c.parseMaintenance([
    { id: "1", status: "RESOLVED", asset_status: "MAINTENANCE", description: "Falla de prueba" },
  ]);
  assert.equal(caseItem.status, "RESOLVED");
  assert.equal(caseItem.asset_status, "MAINTENANCE");
});
test("Contratos: fechas ausentes o invalidas se presentan sin excepciones (FR-2–FR-7)", () => {
  assert.equal(c.dateTime(null), "—");
  assert.equal(c.dateTime("nunca"), "—");
});
