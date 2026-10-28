import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { e2eData, openDialog, storageFile } from "./support.ts";

/** Revisión automática WCAG 2.1 A/AA de la pantalla actual (NFR-5). */
async function expectAccessible(page: Page, screen: string): Promise<void> {
  const { violations, passes } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  // Evita un falso «sin problemas»: axe debe haber evaluado reglas reales, incluido el contraste.
  expect(passes.map((rule) => rule.id)).toContain("color-contrast");
  expect(passes.length).toBeGreaterThan(10);
  const summary = violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help} → ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")}`,
  );
  expect(summary, `Problemas de accesibilidad en «${screen}»`).toEqual([]);
}

test("inicio de sesión accesible y operable solo con el teclado (NFR-5)", async ({ page }) => {
  await page.goto("/login");
  await expectAccessible(page, "inicio de sesión");

  const { accounts } = e2eData();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  await page.keyboard.type(accounts.SECURITY.email);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Contraseña")).toBeFocused();
  await page.keyboard.type(accounts.SECURITY.password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test.describe("como ADMIN", () => {
  test.use({ storageState: storageFile("ADMIN") });

  test("las pantallas principales no tienen problemas WCAG 2.1 AA (NFR-5)", async ({ page }) => {
    const screens: [string, string][] = [
      ["/dashboard", "dashboard"],
      ["/activos", "activos"],
      ["/empleados", "empleados"],
      ["/departamentos", "departamentos"],
      ["/asignaciones", "asignaciones"],
      ["/mantenimiento", "mantenimiento"],
      ["/historial", "historial"],
      ["/reportes", "reportes"],
      ["/usuarios", "usuarios"],
      ["/configuracion", "configuración"],
    ];
    for (const [path, screen] of screens) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectAccessible(page, screen);
    }
  });

  test("un diálogo de registro es accesible y se cierra con Escape (NFR-5)", async ({ page }) => {
    await page.goto("/activos");
    const dialog = await openDialog(page, "+ Nuevo activo");
    await expectAccessible(page, "registrar activo");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("en tableta las pantallas no se desbordan a lo ancho (NFR-5)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const path of ["/dashboard", "/activos", "/asignaciones", "/mantenimiento"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `desborde horizontal en ${path}`).toBeLessThanOrEqual(0);
    }
  });
});
