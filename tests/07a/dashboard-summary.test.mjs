import { test } from "node:test";
import assert from "node:assert/strict";
import { loadLocalTs } from "../06b/helpers/load-ts.mjs";

const { summarizeDashboard } = loadLocalTs("src/lib/dashboard/summary.ts");
const asset = (id, status) => ({ id, status });
const assignment = (id, asset_id, assigned_at, returned_at = null) => ({
  id, asset_id, assigned_at, returned_at,
  internal_code: `X-${id}`, full_name: "Persona",
});
const maintenance = (id, asset_id, status, opened_at, resolved_at = null) => ({
  id, asset_id, status, opened_at, resolved_at,
  internal_code: `X-${id}`, asset_name: "Equipo",
});
const base = { assets: [], assignments: [], cases: [], employees: [] };

// Las comparaciones de objetos VM se hacen por campos individuales.
test("Dashboard: cuatro estados calculados con datos visibles, sin crear valores ficticios", () => {
  const s = summarizeDashboard({ ...base, assets: [
    asset("a", "AVAILABLE"), asset("b", "ASSIGNED"),
    asset("c", "MAINTENANCE"), asset("d", "RETIRED")
  ] });
  assert.equal(s.total, 4); assert.equal(s.available, 1);
  assert.equal(s.assigned, 1); assert.equal(s.maintenance, 1);
  assert.equal(s.retired, 1); assert.equal(s.unknownStatuses, 0);
});

test("Dashboard: lecturas fallidas se representan con null, nunca cero", () => {
  const s = summarizeDashboard({ assets: null, assignments: null, cases: null, employees: null });
  assert.equal(s.total, null); assert.equal(s.available, null);
  assert.equal(s.openCases, null); assert.equal(s.pendingRelease, null);
  assert.equal(s.activeEmployees, null); assert.equal(s.recent, null);
});

test("Dashboard: liberacion solamente cuando todos los casos estan resueltos y no hay entrega abierta", () => {
  const s = summarizeDashboard({ ...base,
    assets: [asset("a", "MAINTENANCE"), asset("b", "MAINTENANCE"), asset("c", "MAINTENANCE")],
    cases: [maintenance("1", "a", "RESOLVED", "2026-10-01T10:00:00Z"),
      maintenance("2", "b", "RESOLVED", "2026-10-02T10:00:00Z"),
      maintenance("3", "b", "OPEN", "2026-10-03T10:00:00Z"),
      maintenance("4", "c", "RESOLVED", "2026-10-04T10:00:00Z")],
    assignments: [assignment("1", "c", "2026-10-05T10:00:00Z")],
  });
  assert.equal(s.pendingRelease, 1);
  assert.equal(s.openCases, 1);
});

test("Dashboard: sin datos para evaluar liberacion no inventa resultado", () => {
  const s = summarizeDashboard({ ...base, assignments: null });
  assert.equal(s.pendingRelease, null);
});

test("Dashboard: eventos ordenados por fecha, retorno distinto a entrega y limite 8", () => {
  const s = summarizeDashboard({ ...base,
    assignments: [assignment("a", "a", "2026-10-01T10:00:00Z", "2026-10-04T10:00:00Z")],
    cases: [maintenance("m", "a", "RESOLVED", "2026-10-02T10:00:00Z", "2026-10-03T10:00:00Z")],
  });
  assert.equal(s.recent.length, 4);
  assert.equal(s.recent[0].kind, "return");
  assert.equal(s.recent[1].kind, "resolution");
  assert.equal(s.recent[2].kind, "maintenance");
  assert.equal(s.recent[3].kind, "assignment");
});

test("Dashboard: fechas invalidas no figuran en actividad", () => {
  const s = summarizeDashboard({ ...base,
    assignments: [assignment("broken", "a", "not-a-date")],
  });
  assert.equal(s.recent.length, 0);
});

test("Dashboard: movimiento sin lectura de asignaciones pero con mantenimiento es parcial", () => {
  const s = summarizeDashboard({ ...base,
    assignments: null,
    cases: [maintenance("m", "a", "OPEN", "2026-10-04T10:00:00Z")],
  });
  assert.equal(s.recent.length, 1);
  assert.equal(s.recent[0].kind, "maintenance");
});

test("Dashboard: empleado activo se cuenta solamente si is_active === true", () => {
  const s = summarizeDashboard({ ...base,
    employees: [{ is_active: true }, { is_active: false }, { is_active: "true" }]
  });
  assert.equal(s.activeEmployees, 1);
});

test("Dashboard: estados desconocidos se declaran y no contaminan los conocidos", () => {
  const s = summarizeDashboard({ ...base, assets: [asset("x", "UNKNOWN")] });
  assert.equal(s.unknownStatuses, 1);
  assert.equal(s.available, 0);
  assert.equal(s.total, 1);
});

test("Dashboard: listas en limite de 500 se señalan como potencialmente parciales", () => {
  const s = summarizeDashboard({ ...base, assignments: Array.from({ length: 500 }, (_, i) =>
    assignment(String(i), "a", "2026-10-01T10:00:00Z")) });
  assert.equal(s.limitedData, true);
  assert.equal(s.recent.length, 8);
});
