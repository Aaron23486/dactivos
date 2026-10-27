/**
 * DACTIVOS 06B-4 — HTTP real con JWT de ADMIN / SECURITY.
 * Los unicos RPC potencialmente mutantes reciben parametros NULL deliberadamente
 * invalidos; el contrato SQL 05E validado exige 22023 para ADMIN y 42501
 * para SECURITY antes de cualquier INSERT/UPDATE. No es una prueba de escrituras
 * exitosas ni una demostracion global de seguridad de todas las RPC.
 * No almacenar en disco correos, contrasenas, JWT, respuestas con datos ni claves.
 */
import readline from "node:readline";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!baseUrl || !publicKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}
let parsed;
try {
  parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("Supabase HTTPS requerido");
  }
} catch {
  console.error("La URL de Supabase no es valida o no utiliza HTTPS.");
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Ejecuta esta prueba interactivamente desde PowerShell.");
  process.exit(1);
}
const prompt = (label, hide = false) =>
  new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    if (hide) {
      rl._writeToOutput = () => {};
      process.stdout.write(label);
    }
    rl.on("SIGINT", () => {
      rl.close();
      reject(new Error("Cancelado por el usuario"));
    });
    rl.question(hide ? "" : label, (value) => {
      rl.close();
      if (hide) process.stdout.write("\n");
      resolve(value);
    });
  });
const makeClient = () =>
  createClient(baseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
    },
  });
let pass = 0,
  fail = 0,
  skip = 0;
function passed(label) {
  pass++;
  console.log(`PASS ${label}`);
}
function failed(label) {
  fail++;
  console.log(`FAIL ${label}`);
}
function skipped(label) {
  skip++;
  console.log(`SKIP ${label}`);
}
const testCases = [
  { rpc: "dactivos_create_department", args: { p_code: null, p_name: null } },
  { rpc: "dactivos_update_department", args: { p_department_id: null, p_name: null } },
  { rpc: "dactivos_set_department_active", args: { p_department_id: null, p_is_active: null } },
];
const createdClients = [];
let admin = null;
let security = null;
let baseline = null;
let runAllowed = false;
function normalized(rows) {
  if (!Array.isArray(rows)) return null;
  return JSON.stringify(
    rows
      .map(({ id, code, name, is_active }) => ({ id, code, name, is_active }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  );
}
async function snapshot(client) {
  const { data, error } = await client.rpc("dactivos_list_departments");
  if (error || !Array.isArray(data)) return null;
  return normalized(data);
}
async function login(role) {
  console.log(`\n=== SESION ${role} ===`);
  const email = (await prompt(`Correo ${role}: `)).trim();
  let password = await prompt(`Contrasena ${role} (oculta): `, true);
  if (!email.includes("@") || !password) {
    password = "";
    failed(`${role}: faltan credenciales`);
    return null;
  }
  const client = makeClient();
  createdClients.push(client);
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    password = "";
    if (error || !data?.user?.id || !data.session?.access_token) {
      failed(`${role}: autenticacion fallida`);
      return null;
    }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || userData.user?.id !== data.user.id) {
      failed(`${role}: identidad no valida`);
      return null;
    }
    const roleResponse = await client.rpc("current_app_role");
    if (roleResponse.error || roleResponse.data !== role) {
      failed(`${role}: rol PostgreSQL no coincide`);
      return null;
    }
    passed(`${role}: sesion JWT e identidad verificadas`);
    return client;
  } catch {
    password = "";
    failed(`${role}: error de conexion/autenticacion`);
    return null;
  }
}
async function evaluateCase(client, role, testcase) {
  // El contrato SQL 05E evalua el rol ANTES que los parametros y ANTES de escribir.
  // Los NULL nunca identifican una fila ni proporcionan codigo o nombre nuevo.
  try {
    const { data, error } = await client.rpc(testcase.rpc, testcase.args);
    const expected = role === "SECURITY" ? "42501" : "22023";
    if (!error) {
      failed(`${role}: ${testcase.rpc} devolvio exito inesperado; detener y revisar`);
      return false;
    }
    if (error.code !== expected) {
      failed(
        `${role}: ${testcase.rpc} respuesta inesperada (${error.code || "sin codigo"}); detener`,
      );
      return false;
    }
    if (data !== null && data !== undefined) {
      failed(`${role}: ${testcase.rpc} incluyo resultado de exito inesperado`);
      return false;
    }
    passed(`${role}: ${testcase.rpc} rechazado con ${expected}; sin operacion valida`);
    return true;
  } catch {
    failed(`${role}: ${testcase.rpc} error de conexion/timeout`);
    return false;
  }
}
try {
  console.log("DACTIVOS 06B-4 — DENEGACIONES ADMINISTRATIVAS CONTROLADAS");
  console.log("Proyecto Supabase:", parsed.hostname);
  console.log(
    "Solo se invocaran las tres RPC ADMIN de Departamentos con TODOS sus argumentos NULL.",
  );
  console.log("Con el contrato 05E, no pueden crear ni modificar datos.");
  console.log("Si el backend ha cambiado, NO ejecutes este script sin revisar sus funciones.");
  const confirm = (
    await prompt("Confirmo contrato SQL 05E intacto y proyecto propio (escribe SI): ")
  ).trim();
  if (confirm !== "SI") throw new Error("Proyecto o contrato no confirmado.");
  admin = await login("ADMIN");
  security = await login("SECURITY");
  if (!admin || !security) {
    skipped("Denegaciones no ejecutadas: faltan sesiones verificadas");
  } else {
    baseline = await snapshot(admin);
    if (baseline === null) {
      failed("No se pudo leer catalogo inicial; no se invocaron RPC administrativas");
    } else {
      passed("Catalogo de departamentos: instantanea inicial obtenida");
      runAllowed = true;
      outer: for (const role of ["SECURITY", "ADMIN"]) {
        const client = role === "SECURITY" ? security : admin;
        for (const item of testCases) {
          if (!(await evaluateCase(client, role, item))) break outer;
        }
      }
      const after = await snapshot(admin);
      if (after === null) failed("Catalogo final: error en lectura");
      else if (after !== baseline)
        failed("Catalogo de departamentos CAMBIO durante la prueba; revisar inmediatamente");
      else passed("Catalogo de departamentos sin cambios antes/despues");
    }
  }
} catch (e) {
  failed(`Interrumpido: ${e instanceof Error ? e.message : "error desconocido"}`);
} finally {
  for (const client of createdClients) {
    try {
      await client.auth.signOut({ scope: "local" });
    } catch {}
  }
  if (runAllowed) {
    skipped(
      "Auditoria de tablas: esta prueba no la consulta; conservacion debe revisarse en SQL Editor si hay anomalías",
    );
  }
  console.log(`\nRESULTADO: PASS=${pass} FAIL=${fail} SKIP=${skip}`);
  console.log(
    "Envia solo lineas PASS/FAIL/SKIP y resumen; no compartas correos, JWT ni contrasenas.",
  );
  if (fail) process.exitCode = 1;
}
