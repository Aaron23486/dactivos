import { expect, test } from "@playwright/test";
import { storageFile } from "./support.ts";

// Content Security Policy con nonce por solicitud (NFR-1, D14): la app funciona sin violaciones y
// un script inyectado en la página no se ejecuta.
test.use({ storageState: storageFile("ADMIN") });

function nonceOf(policy: string | undefined): string {
  const nonce = policy?.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce, "la política lleva un nonce").toBeTruthy();
  return nonce!;
}

test("cada respuesta trae un nonce nuevo y la política no permite scripts en línea (NFR-1, D14)", async ({
  page,
}) => {
  const first = await page.goto("/dashboard");
  const second = await page.goto("/dashboard");
  const policy = first!.headers()["content-security-policy"];
  const scriptSrc = policy.split("; ").find((d) => d.startsWith("script-src "))!;
  expect(scriptSrc).toContain("'strict-dynamic'");
  expect(scriptSrc).not.toContain("'unsafe-inline'");
  expect(scriptSrc).not.toContain("'unsafe-eval'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(nonceOf(policy)).not.toBe(nonceOf(second!.headers()["content-security-policy"]));

  // Todos los scripts que entrega el servidor llevan el nonce de esta respuesta.
  const nonce = nonceOf(second!.headers()["content-security-policy"]);
  const scripts = await page
    .locator("script")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).nonce));
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.every((value) => value === nonce)).toBe(true);
});

test("las pantallas funcionan sin violaciones de la política (NFR-1, D14)", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  for (const path of [
    "/dashboard",
    "/activos",
    "/asignaciones",
    "/mantenimiento",
    "/historial",
    "/usuarios",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // Un diálogo depende de los scripts de la página: si la CSP los bloqueara, no se abriría.
  await page.goto("/activos");
  await page.getByRole("button", { name: "+ Nuevo activo" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(violations).toEqual([]);
});

test("un manejador de eventos inyectado en la página no se ejecuta (NFR-1, D14)", async ({
  page,
}) => {
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) blocked.push(message.text());
  });
  await page.goto("/activos");
  const ran = await page.evaluate(async () => {
    const holder = document.createElement("div");
    // Lo que haría un XSS que lograra escribir HTML en la página.
    holder.innerHTML = '<img src="/sin-imagen.png" onerror="window.__xss = true">';
    document.body.appendChild(holder);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return (window as unknown as { __xss?: boolean }).__xss === true;
  });
  expect(ran).toBe(false);
  expect(blocked.some((text) => /inline event handler/i.test(text))).toBe(true);
});
