import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(name, "utf8");

test("UI01: paleta Industrial Tech y dark permanente", () => {
  const css = read("src/app/globals.css");
  const layout = read("src/app/layout.tsx");
  for (const color of ["#111827", "#1f2937", "#06b6d4", "#f59e0b"]) {
    assert.ok(css.toLowerCase().includes(color), color);
  }
  assert.match(layout, /className=\{`[^`]*\bdark\b/);
  assert.match(css, /prefers-reduced-motion/);
});

test("UI01: agrupaciones de navegación conservan todas las rutas", () => {
  const shell = read("src/components/layout/app-shell.tsx");
  const nav = read("src/lib/navigation.ts");
  for (const route of [
    "dashboard",
    "activos",
    "empleados",
    "departamentos",
    "asignaciones",
    "mantenimiento",
    "historial",
    "reportes",
    "usuarios",
    "configuracion",
  ]) {
    assert.match(shell, new RegExp(`"/${route}"`));
    assert.match(nav, new RegExp(`href: "/${route}"`));
  }
  assert.match(shell, /role === "ADMIN"/);
  assert.match(shell, /aria-current=\{active/);
  assert.match(shell, /aria-label="Menú móvil"/);
});

test("UI01: tarjetas y estados mantienen valores de backend", () => {
  const primitives = read("src/components/operations/primitives.tsx");
  const overview = read("src/components/dashboard/dashboard-overview.tsx");
  for (const status of ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED", "OPEN", "RESOLVED"]) {
    assert.ok(primitives.includes(status), status);
  }
  assert.match(overview, /summarizeDashboard/);
  assert.match(overview, /summary\.recent\.map/);
  assert.match(overview, /href=\{event\.href\}/);
});

test("UI01: acciones no pierden protección de doble envío", () => {
  const form = read("src/components/operations/action-form.tsx");
  assert.match(form, /if \(busy\) return/);
  assert.match(form, /await action\(fd\)/);
  assert.match(form, /router\.refresh\(\)/);
  assert.match(form, /disabled=\{busy\}/);
});

test("UI01: no cambia seguridad ni lógica del esquema", () => {
  const files = [
    "src/app/globals.css",
    "src/app/layout.tsx",
    "src/components/layout/app-shell.tsx",
    "src/components/operations/primitives.tsx",
    "src/components/operations/action-form.tsx",
    "src/components/dashboard/dashboard-overview.tsx",
    "src/app/(auth)/login/page.tsx",
  ];
  for (const name of files) {
    const text = read(name);
    assert.doesNotMatch(text, /SUPABASE_SERVICE_ROLE_KEY|auth\.admin|force-dynamic/i);
  }
});
