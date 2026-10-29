import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { readLocalSupabase } from "../scripts/lib/supabase-admin.ts";

/**
 * Pruebas e2e en el navegador (NFR-5): flujos principales, roles, invitación y accesibilidad.
 * Compilan y levantan la app en modo producción en :3100 contra el Supabase local
 * (`npm run db:up`), así no interfieren con `npm run dev` (:3000). Cada ejecución crea sus
 * propias cuentas y datos con un prefijo único (global-setup.ts).
 */
const repoRoot = resolve(import.meta.dirname, "..");
const PORT = 3100;
const supabase = readLocalSupabase();

export default defineConfig({
  testDir: "./tests",
  // Los escenarios comparten las cuentas y los datos preparados: uno a la vez, en orden.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "./playwright-report" }]]
    : [["list"]],
  globalSetup: "./global-setup.ts",
  outputDir: "./test-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-CR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Por defecto, el Chromium de Playwright (`npx playwright install chromium`). Con
  // E2E_BROWSER_CHANNEL=msedge (o chrome) se usa el navegador ya instalado en el equipo.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_BROWSER_CHANNEL ?? "chromium" },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    cwd: repoRoot,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
    } as Record<string, string>,
  },
});
