/**
 * DACTIVOS / 06B-2 — Validaciones HTTP de solo lectura con JWT reales.
 * Uso: node tests/06b/auth-readonly.mjs
 *
 * - Solicita email y contrasena de ADMIN y SECURITY localmente (sin eco de contrasena).
 * - Nunca imprime JWT, contrasenas, filas ni secretos.
 * - No modifica registros ni invoca RPC de escritura.
 * - La autenticacion puede crear sesiones temporales, pero no altera tablas operativas.
 * - No confundir estas pruebas con verificacion de rutas server actions o concurrencia.
 */
import readline from "node:readline";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!baseUrl || !publicKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
  );
  process.exit(1);
}
let url;
try {
  url = new URL(baseUrl);
  if (url.protocol !== "https:") throw Error("HTTPS requerido");
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL debe ser una URL HTTPS valida.");
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error(
    "Ejecuta este script interactivamente desde PowerShell, no mediante pipelines o CI.",
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
      // Evita que readline refleje el texto tecleado al terminal.
      rl._writeToOutput = function () {};
      process.stdout.write(label);
    }
    rl.on("SIGINT", () => {
      rl.close();
      reject(new Error("Cancelado por el usuario"));
    });
    rl.question(secret ? "" : label, (value) => {
      rl.close();
      if (secret) process.stdout.write("\n");
      resolve(value);
    });
  });
}

const readRpcs = [
  "dactivos_list_assets",
  "dactivos_list_employees",
  "dactivos_list_departments",
  "dactivos_list_asset_categories",
  "dactivos_list_assignments",
  "dactivos_list_maintenance_cases",
];
let pass = 0,
  fail = 0,
  skip = 0;
function ok(msg) {
  pass++;
  console.log("PASS " + msg);
}
function bad(msg) {
  fail++;
  console.error("FAIL " + msg);
}
function blocked(msg) {
  skip++;
  console.log("SKIP " + msg);
}
const metadata = {};

function makeClient() {
  return createClient(baseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
    },
  });
}

async function authenticatedChecks(role) {
  console.log(`\n=== SESION ${role} ===`);
  const email = (await ask(`Correo ${role}: `)).trim();
  if (!email || !email.includes("@")) throw new Error(`Correo ${role} no valido`);
  let password = await ask(`Contrasena ${role} (oculta): `, true);
  const client = makeClient();
  try {
    const { data: signed, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    password = ""; // Minimizar retencion accidental.
    if (authError || !signed?.user?.id || !signed.session?.access_token) {
      bad(`${role}: no se pudo autenticar (credenciales o sesion invalidas)`);
      return false;
    }
    ok(`${role}: login con JWT real`);
    const { data: verified, error: verifyError } = await client.auth.getUser();
    if (verifyError || verified.user?.id !== signed.user.id) {
      bad(`${role}: identidad no verificada por Supabase Auth`);
      return false;
    }
    ok(`${role}: identidad validada en Auth`);
    const roleResult = await client.rpc("current_app_role");
    if (roleResult.error || roleResult.data !== role) {
      bad(`${role}: current_app_role no coincide con ${role}`);
      return false;
    }
    ok(`${role}: rol verificado por PostgreSQL`);
    metadata[role] = {};
    for (const rpc of readRpcs) {
      try {
        const { data, error } = await client.rpc(rpc);
        if (error || !Array.isArray(data)) {
          bad(`${role}: ${rpc} fallo (${error?.code || "respuesta no valida"})`);
          continue;
        }
        metadata[role][rpc] = data;
        ok(`${role}: ${rpc} lectura permitida (${data.length} filas)`);
      } catch {
        bad(`${role}: ${rpc} fallo de conexion o timeout`);
      }
    }
    return true;
  } finally {
    password = "";
    // Descartar sesion local; no imprimimos ni conservamos JWT.
    try {
      await client.auth.signOut({ scope: "local" });
    } catch {}
  }
}

function roleVisibility() {
  const admin = metadata.ADMIN,
    security = metadata.SECURITY;
  if (!admin || !security) {
    blocked("Visibilidad entre roles: no hay dos sesiones validas para comparar");
    return;
  }
  for (const [rpc, check, label] of [
    ["dactivos_list_assets", (row) => row.status === "RETIRED", "activos retirados"],
    ["dactivos_list_departments", (row) => row.is_active === false, "departamentos inactivos"],
    ["dactivos_list_employees", (row) => row.is_active === false, "empleados inactivos"],
    ["dactivos_list_asset_categories", (row) => row.is_active === false, "categorias inactivas"],
  ]) {
    const adminRows = admin[rpc],
      securityRows = security[rpc];
    if (!adminRows || !securityRows) {
      blocked(`${label}: faltan respuestas validas`);
      continue;
    }
    const forbidden = adminRows.filter(check);
    if (forbidden.length === 0) {
      blocked(`${label}: sin datos restringidos existentes para probar ocultamiento`);
      continue;
    }
    const ids = new Set(forbidden.map((row) => String(row.id ?? row.code)));
    const leaked = securityRows.some((row) => ids.has(String(row.id ?? row.code)));
    if (leaked) bad(`SECURITY puede ver ${label} que solo ADMIN debe consultar`);
    else ok(`SECURITY no ve ${label} registrados`);
  }
  const securityData = security.dactivos_list_assets;
  if (securityData) {
    if (securityData.some((row) => row.status === "RETIRED"))
      bad("SECURITY recibio activos RETIRED");
    else ok("SECURITY no recibe activos RETIRED");
  }
  const deps = security.dactivos_list_departments;
  if (deps) {
    if (deps.some((row) => row.is_active !== true)) bad("SECURITY recibio departamento inactivo");
    else ok("SECURITY recibe solo departamentos activos");
  }
  const employees = security.dactivos_list_employees;
  if (employees) {
    if (employees.some((row) => row.is_active !== true)) bad("SECURITY recibio empleado inactivo");
    else ok("SECURITY recibe solo empleados activos");
  }
}

async function malformedTokenCheck() {
  // POST sobre una RPC de LECTURA, sin usuario autenticado.
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/rpc/current_app_role`, {
      method: "POST",
      headers: {
        apikey: publicKey,
        Authorization: "Bearer invalid.invalid.invalid",
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(20000),
    });
    if ([401, 403].includes(response.status)) ok("JWT malformado rechazado por HTTP");
    else bad(`JWT malformado: HTTP inesperado ${response.status}`);
  } catch {
    bad("JWT malformado: error de red o timeout");
  }
}

try {
  console.log("DACTIVOS 06B-2 — JWT READ ONLY");
  console.log("Supabase configurado:", url.hostname);
  console.log("No se enviaran claves a ChatGPT ni se ejecutaran RPC de escritura.");
  const confirm = (
    await ask("Confirma que corresponde a TU Supabase de DACTIVOS (escribe SI): ")
  ).trim();
  if (confirm !== "SI") throw new Error("Proyecto no confirmado; ninguna prueba ejecutada.");
  await malformedTokenCheck();
  const adminReady = await authenticatedChecks("ADMIN");
  const securityReady = await authenticatedChecks("SECURITY");
  roleVisibility();
  if (!adminReady || !securityReady) blocked("Autorizacion ADMIN/SECURITY completa pendiente");
  blocked("Denegacion de RPC de escritura a SECURITY: no se invoco (modo sin escrituras)");
  blocked("Usuario inactivo/sin perfil: requiere cuenta habilitada especifica para esta prueba");
  console.log(`\nRESULTADO: PASS=${pass} FAIL=${fail} SKIP=${skip}`);
  console.log(
    "No compartas emails, JWT ni contrasenas; envia solamente las lineas PASS/FAIL/SKIP y el resumen.",
  );
  if (fail) process.exitCode = 1;
} catch (error) {
  console.error(`INTERRUMPIDO: ${error instanceof Error ? error.message : "Error desconocido"}`);
  process.exitCode = 1;
}
