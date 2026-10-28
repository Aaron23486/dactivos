import { expect, test } from "@playwright/test";
import { e2eData, signInThroughForm, storageFile } from "./support.ts";

test.describe("sin sesión", () => {
  test("una contraseña incorrecta recibe un mensaje genérico (NFR-1)", async ({ page }) => {
    const { accounts } = e2eData();
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(accounts.SECURITY.email);
    await page.getByLabel("Contraseña").fill("ContraseñaIncorrecta1");
    await page.getByRole("button", { name: "Ingresar a Dactivos" }).click();
    // Next.js adds its own empty route announcer with role=alert; the message is found by text.
    await expect(
      page.getByRole("alert").filter({
        hasText: "No fue posible iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.",
      }),
    ).toBeVisible();
  });

  test("las pantallas privadas llevan al inicio de sesión (FR-1)", async ({ page }) => {
    for (const path of ["/dashboard", "/activos", "/usuarios", "/reportes"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("la cookie de sesión no es legible por JavaScript y cerrar sesión la invalida (NFR-1, R13, D12)", async ({
    page,
  }) => {
    await signInThroughForm(page, e2eData().accounts.SIGN_OUT);
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name.includes("auth-token"));
    expect(session, "existe la cookie de sesión").toBeTruthy();
    expect(session!.httpOnly).toBe(true);
    expect(session!.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("auth-token");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("SECURITY", () => {
  test.use({ storageState: storageFile("SECURITY") });

  test("opera el inventario pero no ve ni abre las pantallas de administración (FR-1)", async ({
    page,
  }) => {
    await page.goto("/activos");
    await expect(page.getByRole("heading", { name: "Activos tecnológicos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dar de baja" })).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Navegación principal" }).first();
    for (const item of ["Usuarios", "Reportes", "Configuración"]) {
      await expect(nav.getByRole("link", { name: item })).toHaveCount(0);
    }
    for (const path of ["/usuarios", "/reportes", "/configuracion"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/acceso-denegado/);
    }
    const csv = await page.request.get("/api/reportes?tipo=employees", { maxRedirects: 0 });
    expect(csv.status()).not.toBe(200);
  });

  test("la página para crear contraseña rechaza una sesión normal (FR-11, D12)", async ({
    page,
  }) => {
    await page.goto("/establecer-contrasena");
    await expect(page).not.toHaveURL(/establecer-contrasena/);
    await expect(page.getByLabel("Nueva contraseña")).toHaveCount(0);
  });
});

test.describe("ADMIN", () => {
  test.use({ storageState: storageFile("ADMIN") });

  test("ve todas las secciones y descarga un reporte que queda en el historial (FR-1, FR-10, D13)", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "Navegación principal" }).first();
    for (const item of ["Usuarios", "Reportes", "Configuración", "Historial"]) {
      await expect(nav.getByRole("link", { name: item })).toBeVisible();
    }
    const csv = await page.request.get("/api/reportes?tipo=assets");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");

    await page.goto("/historial");
    await expect(page.getByRole("cell", { name: "REPORTE" }).first()).toBeVisible();
  });
});
