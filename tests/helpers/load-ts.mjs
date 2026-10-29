import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const requireLocal = createRequire(import.meta.url);
const ts = requireLocal("typescript");

// Transpila SOLO los modulos TypeScript locales en memoria.
// No ejecuta Next.js ni contacta Supabase.
export function loadLocalTs(relativeFile, mocks = {}) {
  const file = resolve(process.cwd(), relativeFile);
  const input = readFileSync(file, "utf8");
  const { outputText, diagnostics } = ts.transpileModule(input, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const errors = (diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length)
    throw Error(
      `Error al transpilar ${relativeFile}: ${errors.map((e) => e.messageText).join("; ")}`,
    );
  const exports = {};
  const testRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name === "server-only" || name.startsWith("next/")) {
      throw Error(`Import no simulado: ${name}`);
    }
    return requireLocal(name);
  };
  runInNewContext(
    outputText,
    { exports, require: testRequire, module: { exports }, console, Date, Intl, process, FormData },
    // Solo protege contra un módulo que nunca termina de cargar. Cargar sus dependencias (zod, por
    // ejemplo) tardó más de 2 s en un equipo ocupado y hacía fallar pruebas correctas.
    { filename: file, timeout: 10000 },
  );
  return exports;
}
