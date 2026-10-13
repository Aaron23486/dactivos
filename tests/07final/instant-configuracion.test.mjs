import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = process.cwd();
const relativePage = "src/app/(dashboard)/configuracion/page.tsx";
const file = resolve(root, relativePage);
const source = readFileSync(file, "utf8");
const syntax = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);

function fn(name) {
  return syntax.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === name
  );
}

test("Configuración Instant: parseo y shell sin operaciones dinámicas", () => {
  assert.equal(syntax.parseDiagnostics.length, 0);
  const page = fn("Page");
  assert.ok(page);
  assert.ok(page.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
  assert.ok(!page.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword));
  const body = page.body.getText(syntax);
  assert.match(body, /<Suspense/);
  assert.match(body, /<ConfigurationContent\s*\/>/);
  assert.doesNotMatch(body, /await\s+(?:connection|searchParams)\b/);
});

test("Configuración Instant: conexión y permiso ADMIN dentro del contenido suspendido", () => {
  const content = fn("ConfigurationContent");
  assert.ok(content);
  const body = content.body.getText(syntax);
  assert.match(body, /await\s+connection\(\)/);
  assert.match(body, /await\s+requirePermission\("settings\.manage"\)/);
  assert.match(body, /loadAssets\(\)/);
  assert.match(body, /loadCategories\(\)/);
  assert.match(body, /loadDepartments\(\)/);
  assert.ok(body.indexOf('await requirePermission') < body.indexOf('loadCategories()'));
});

test("Configuración Instant: no lee datos antes del límite Suspense", async () => {
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const errors = result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(errors.length, 0);
  const calls = [];
  const Suspense = Symbol("Suspense");
  const jsx = (type, props) => ({type, props});
  const mocks = {
    "react": {Suspense},
    "react/jsx-runtime": {jsx, jsxs: jsx},
    "next/link": () => null,
    "next/server": {connection: async () => { calls.push("connection"); }},
    "@/lib/auth/require-permission": {requirePermission: async (key) => {calls.push("permission:" + key);}},
    "@/lib/operations/server-data": {
      loadAssets: async () => {calls.push("assets");return {items: [], error:null};},
      loadCategories: async () => {calls.push("categories");return {items: [], error:null};},
      loadDepartments: async () => {calls.push("departments");return {items: [], error:null};},
    },
  };
  const commonJsModule = {exports: {}};
  runInNewContext(result.outputText, {
    module: commonJsModule,
    exports: commonJsModule.exports,
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Dependencia no prevista: ${name}`);
      return mocks[name];
    },
  }, {filename: file, timeout: 1000});
  const rendered = commonJsModule.exports.default();
  assert.equal(rendered.type, Suspense);
  assert.deepEqual(calls, [], "Sin consultar servicios antes de Suspense");
  assert.equal(typeof rendered.props.children.type, "function");
  await rendered.props.children.type(rendered.props.children.props);
  assert.equal(calls[0], "connection");
  assert.equal(calls[1], "permission:settings.manage");
  assert.deepEqual(calls.slice(2).sort(), ["assets", "categories", "departments"]);
});

function walk(directory) {
  return readdirSync(directory, {withFileTypes:true}).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) :
      /(?:^|\/)(?:page|layout)\.tsx$/.test(path.replaceAll("\\", "/")) ? [path] : [];
  });
}

test("Auditoría: todas las rutas dejan URL/conexión en componentes suspendidos", () => {
  const appRoot = resolve(root, "src/app");
  const files = walk(appRoot);
  assert.ok(files.length >= 15, "Cobertura mínima de páginas y layouts");
  const failures = [];
  for (const route of files) {
    const code = readFileSync(route, "utf8");
    const ast = ts.createSourceFile(route, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    for (const statement of ast.statements) {
      if (!ts.isFunctionDeclaration(statement) || !statement.body ||
          !statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) continue;
      const body = statement.body.getText(ast);
      if (/await\s+(?:connection\s*\(|searchParams\b)/.test(body)) {
        failures.push(route.replace(root, "") + ": dinámica en función exportada");
      }
      if (/(?:await\s+connection\(\)|await\s+searchParams\b)/.test(code) &&
          !code.includes("<Suspense")) {
        failures.push(route.replace(root, "") + ": falta límite Suspense");
      }
    }
  }
  assert.deepEqual(failures, [], failures.join("\n"));
});
