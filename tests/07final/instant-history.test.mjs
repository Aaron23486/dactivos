import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { resolve } from "node:path";
import ts from "typescript";

const file = resolve(process.cwd(), "src/app/(dashboard)/historial/page.tsx");
const source = readFileSync(file, "utf8");
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);

function nodeText(node) {
  return node.getText(parsed);
}
function findFunction(name) {
  return parsed.statements.find(
    (item) => ts.isFunctionDeclaration(item) && item.name?.text === name,
  );
}

test("Instant: Page es sincronica y no consume URL antes de Suspense", () => {
  assert.equal(parsed.parseDiagnostics.length, 0, "TSX parseable");
  const page = findFunction("Page");
  assert.ok(page, "Pagina existe");
  assert.ok(!page.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword));
  assert.doesNotMatch(nodeText(page.body), /await\s+searchParams/);
  assert.match(nodeText(page.body), /<Suspense/);
  assert.match(nodeText(page.body), /<HistoryContent\s+searchParams=\{searchParams\}/);
});

test("Instant: la lectura de searchParams y la autorización quedan en contenido suspendido", () => {
  const content = findFunction("HistoryContent");
  assert.ok(content);
  const body = nodeText(content.body);
  assert.match(body, /await\s+connection\(\)/);
  assert.match(body, /await\s+requirePermission\("history\.read"\)/);
  assert.match(body, /await\s+searchParams/);
  assert.ok(body.indexOf("await requirePermission") < body.indexOf("await searchParams"));
});

function loadWithMocks() {
  const transpiled = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const errors =
    transpiled.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
  assert.equal(errors.length, 0, JSON.stringify(errors));
  const logs = [];
  const Suspense = Symbol("Suspense");
  const HistoryBoard = Symbol("HistoryBoard");
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { Suspense },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/server": {
      connection: async () => {
        logs.push("connection");
      },
    },
    "@/lib/auth/require-permission": {
      requirePermission: async (permission) => {
        logs.push(`permission:${permission}`);
      },
    },
    "@/lib/history/server-data": {
      loadAuditEvents: async (offset) => {
        logs.push(`query:${offset}`);
        return { items: [{ id: "event" }], error: null };
      },
    },
    "@/components/history/history-board": { HistoryBoard },
  };
  const commonJsModule = { exports: {} };
  const stubRequire = (name) => {
    assert.ok(Object.hasOwn(mocks, name), `import inesperado ${name}`);
    return mocks[name];
  };
  runInNewContext(
    transpiled.outputText,
    {
      module: commonJsModule,
      exports: commonJsModule.exports,
      require: stubRequire,
    },
    { filename: file, timeout: 1500 },
  );
  return { Page: commonJsModule.exports.default, Suspense, HistoryBoard, logs };
}

test("Instant: paginación exacta y lectura diferida por cada solicitud", async () => {
  for (const [rawPage, expected] of [
    ["1", 0],
    ["2", 100],
    ["100", 9900],
    ["0", 0],
    ["101", 0],
    ["abc", 0],
    [undefined, 0],
    [["1", "2"], 0],
    ["2.1", 0],
  ]) {
    const { Page, Suspense, HistoryBoard, logs } = loadWithMocks();
    let resolved = false;
    const promise = Promise.resolve({ page: rawPage }).then((result) => {
      resolved = true;
      return result;
    });
    const shell = Page({ searchParams: promise });
    assert.equal(shell.type, Suspense);
    assert.equal(resolved, false, "Page no espera searchParams");
    const inner = shell.props.children;
    assert.equal(typeof inner.type, "function");
    const board = await inner.type(inner.props);
    assert.equal(board.type, HistoryBoard);
    assert.equal(board.props.offset, expected);
    assert.deepEqual(logs, ["connection", "permission:history.read", `query:${expected}`]);
  }
});
