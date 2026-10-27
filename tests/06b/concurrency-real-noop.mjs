/**
 * DACTIVOS 06B-5 — Concurrent real HTTP requests through PostgREST.
 * One existing department, same desired status (expected no-op) across many ADMIN requests.
 * This exercises real DB transactions and FOR UPDATE in dactivos_set_department_active,
 * but does NOT prove assignment/return concurrency, nor prove lock contention occurred.
 * WARN: A concurrent change to that department while running creates a race that could
 * make a request change its state. Run only when no other operators are editing.
 */
import readline from "node:readline";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const expectedHost = "zkzfzuakzvdknwnvqivy.supabase.co";
let host;
try {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw Error("HTTPS requerido");
  host = parsed.hostname;
  if (host !== expectedHost) throw Error("Proyecto de Supabase distinto del esperado");
  if (!key) throw Error("Falta publishable key");
} catch {
  console.error(
    "FAIL Configuracion incorrecta. Se requiere .env.local del proyecto DACTIVOS actual.",
  );
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "FAIL Ejecuta la prueba de forma interactiva en PowerShell, sin redireccionar entrada.",
  );
  process.exit(1);
}
function ask(label, secret = false) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (secret) {
      rl._writeToOutput = () => {};
      process.stdout.write(label);
    }
    rl.on("SIGINT", () => {
      rl.close();
      reject(Error("Cancelado"));
    });
    rl.question(secret ? "" : label, (value) => {
      rl.close();
      if (secret) process.stdout.write("\n");
      resolve(value);
    });
  });
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(25000) }) },
});
let pass = 0,
  fail = 0,
  skip = 0,
  authenticated = false;
function passed(msg) {
  pass += 1;
  console.log(`PASS ${msg}`);
}
function failed(msg) {
  fail += 1;
  console.log(`FAIL ${msg}`);
}
function skipped(msg) {
  skip += 1;
  console.log(`SKIP ${msg}`);
}
function normalized(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.every((row) => row && typeof row.id === "string" && typeof row.is_active === "boolean")
  )
    return null;
  // Stable snapshot of all fields returned by backend; no data is printed.
  return JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)));
}
async function getDepartments() {
  const { data, error } = await client.rpc("dactivos_list_departments");
  if (error || !Array.isArray(data)) throw Error("Lectura de departamentos fallida");
  const fingerprint = normalized(data);
  if (fingerprint === null) throw Error("Contrato de lista de departamentos inesperado");
  return { data, fingerprint };
}
async function loginAdmin() {
  const email = (await ask("Correo ADMIN: ")).trim();
  let password = await ask("Contrasena ADMIN (oculta): ", true);
  try {
    if (!email.includes("@") || !password) throw Error("Credenciales incompletas");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data?.user?.id || !data.session?.access_token)
      throw Error("No se pudo iniciar sesion");
    authenticated = true;
    const verified = await client.auth.getUser();
    if (verified.error || verified.data.user?.id !== data.user.id)
      throw Error("Identidad Auth no verificada");
    const role = await client.rpc("current_app_role");
    if (role.error || role.data !== "ADMIN") throw Error("El usuario autenticado no es ADMIN");
    passed("ADMIN: JWT e identidad verificados contra el mismo Supabase");
  } finally {
    password = "";
  }
}
async function noOpCall(id, currentValue) {
  try {
    const { data, error } = await client.rpc("dactivos_set_department_active", {
      p_department_id: id,
      p_is_active: currentValue,
    });
    return error
      ? { ok: false, code: String(error.code || "SIN_CODIGO") }
      : { ok: data === false, code: data === false ? "FALSE" : "EXITO_INESPERADO" };
  } catch {
    return { ok: false, code: "RED_TIMEOUT" };
  }
}
console.log("DACTIVOS 06B-5 — PETICIONES CONCURRENTES REALES (NO-OP ESPERADO)");
console.log("Proyecto confirmado por configuracion:", host);
console.log("Usa JWT real y la RPC existente con el MISMO estado del departamento.");
console.log(
  "RIESGO: si otro usuario modifica el departamento durante la prueba, alguna llamada podria modificar su estado.",
);
console.log(
  "No prueba concurrencia de asignaciones ni garantiza que todas las solicitudes se bloquearon mutuamente.",
);
try {
  const agreement = (
    await ask(
      "Confirma SQL 06B-4 intacto, sin otros editores de departamentos, y aceptas el riesgo (escribe ACEPTO): ",
    )
  ).trim();
  if (agreement !== "ACEPTO")
    throw Error("No se aceptaron las condiciones, sin llamadas de escritura");
  await loginAdmin();
  const before = await getDepartments();
  const target = before.data.find((d) => d.is_active === true) ?? before.data[0];
  if (!target) {
    skipped("Sin departamentos existentes para comprobar concurrencia");
  } else {
    passed("Catalogo inicial leido y departamento de prueba seleccionado");
    const recheck = await getDepartments();
    if (recheck.fingerprint !== before.fingerprint) {
      failed(
        "El catalogo cambio durante la prevalidacion; ninguna operacion concurrente ejecutada",
      );
    } else {
      const calls = 12;
      console.log(
        `Ejecutando ${calls} RPC simultaneas sobre un mismo departamento, solicitando el estado actual (sin mostrar datos).`,
      );
      const results = await Promise.all(
        Array.from({ length: calls }, () => noOpCall(target.id, target.is_active)),
      );
      const successful = results.filter((r) => r.ok).length;
      if (successful === calls)
        passed(
          `${calls}/${calls} peticiones simultaneas ejecutaron transaccion PostgreSQL y devolvieron false (sin cambio)`,
        );
      else {
        const codes = [...new Set(results.filter((r) => !r.ok).map((r) => r.code))].join(", ");
        failed(
          `Hubo ${calls - successful}/${calls} respuestas distintas de false (codigos: ${codes}). Revisar.`,
        );
      }
      const after = await getDepartments();
      if (before.fingerprint === after.fingerprint)
        passed("Instantaneas de departamentos identicas antes y despues");
      else
        failed(
          "Se detecto diferencia en departamentos antes/despues: revisar inmediatamente el estado y la auditoria",
        );
      skipped("Concurrencia de asignaciones/devoluciones reales: NO probada por este script");
      skipped("Auditoria historica SQL: no se lee en esta prueba");
    }
  }
} catch (e) {
  failed(`Prueba interrumpida: ${e instanceof Error ? e.message : "error desconocido"}`);
} finally {
  if (authenticated) {
    try {
      await client.auth.signOut({ scope: "local" });
    } catch {}
  }
  console.log(`\nRESULTADO: PASS=${pass} FAIL=${fail} SKIP=${skip}`);
  console.log("Comparte solamente PASS/FAIL/SKIP y resumen. No compartas credenciales ni JWT.");
  if (fail) process.exitCode = 1;
}
