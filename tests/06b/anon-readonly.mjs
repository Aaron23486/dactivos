// Prueba HTTP opcional: solo lecturas con la llave publica local.
// Uso: node tests/06b/anon-readonly.mjs
// No solicita contrasenas, no crea sesiones ni escribe datos.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw Error("Faltan variables publicas de Supabase (consultar .env.local).");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const names = [
  "current_app_role",
  "dactivos_list_assets",
  "dactivos_list_employees",
  "dactivos_list_departments",
  "dactivos_list_assignments",
  "dactivos_list_maintenance_cases",
];
let failures = 0;
for (const name of names) {
  try {
    const { data, error } = await supabase.rpc(name);
    if (!error) {
      failures++;
      console.error(
        `FAIL ${name}: funcion accesible anonimamente (${data === null ? "NULL" : "datos"})`,
      );
    } else console.log(`PASS ${name}: anon rechazado, codigo ${error.code ?? "sin codigo"}`);
  } catch (e) {
    failures++;
    console.error(`INCONCLUSO ${name}: ${e instanceof Error ? e.message : "fallo de red"}`);
  }
}
if (failures) {
  console.error(`Se encontraron ${failures} accesos inesperados o pruebas inconclusas.`);
  process.exitCode = 1;
} else console.log("PASS: las seis RPC rechazaron ejecucion anonima.");
