import { expect, test } from "@playwright/test";
import { e2eData, openDialog, storageFile, submitDialog } from "./support.ts";

// El ciclo de un equipo desde las pantallas, como lo hace un operador SECURITY:
// entregar, recibir dañado, resolver el mantenimiento y liberar tras la revisión física.
test.use({ storageState: storageFile("SECURITY") });

test("entrega, devolución dañada, mantenimiento y liberación (FR-5, FR-6, FR-7, R5–R7)", async ({
  page,
}) => {
  const { assets, employees } = e2eData();
  const asset = assets[0];
  const employee = employees[0];

  // Entrega por código, como si se escaneara.
  await page.goto("/asignaciones");
  const deliver = await openDialog(page, "+ Entregar equipo");
  await deliver.getByLabel("Código, serie o identificador del equipo").fill(asset.code);
  await deliver
    .getByLabel(/Empleado receptor/)
    .selectOption({ label: `${employee.code} · ${employee.name}` });
  await deliver.getByLabel("Confirmo la entrega física al empleado").check();
  await submitDialog(page, "Confirmar entrega");

  const row = page.getByRole("row").filter({ hasText: asset.code });
  await expect(row).toBeVisible();
  await expect(row).toContainText(employee.name);

  // Devolución con daño: abre un caso de mantenimiento.
  const receive = await (async () => {
    await row.getByRole("button", { name: "Recibir equipo" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    return dialog;
  })();
  await receive.getByLabel(/Estado físico/).selectOption("DAMAGED");
  await receive
    .getByLabel(/Descripción \/ daños/)
    .fill("Pantalla con fisura detectada en la recepción e2e.");
  await receive.getByRole("checkbox").check();
  await submitDialog(page, "Confirmar devolución");

  await page.goto("/activos");
  await expect(page.getByRole("row").filter({ hasText: asset.code })).toContainText(
    /MAINTENANCE|Mantenimiento/i,
  );

  // Resolver no libera el equipo.
  await page.goto("/mantenimiento");
  const caseRow = page.getByRole("row").filter({ hasText: asset.code });
  await expect(caseRow).toBeVisible();
  await caseRow.getByRole("button", { name: "Resolver" }).click();
  const resolve = page.getByRole("dialog");
  await resolve
    .getByLabel(/Intervención y resultado/)
    .fill("Se reemplazó la pantalla y se probó el lector.");
  await resolve.getByLabel("Confirmo que esta incidencia ha sido resuelta").check();
  await submitDialog(page, "Registrar resolución");

  await page.goto("/activos");
  await expect(page.getByRole("row").filter({ hasText: asset.code })).toContainText(
    /MAINTENANCE|Mantenimiento/i,
  );

  // La revisión física lo devuelve a disponible.
  await page.goto("/mantenimiento");
  const release = await openDialog(page, "Liberar equipo reparado");
  await release
    .getByLabel(/Equipo en mantenimiento/)
    .selectOption({ label: `${asset.code} · ${asset.name}` });
  await release
    .getByLabel(/Resultado de inspección física/)
    .fill("Revisado en sitio: enciende y lee códigos.");
  await release
    .getByLabel("He inspeccionado físicamente el equipo y confirmo que es apto para uso")
    .check();
  await release.getByRole("checkbox").last().check();
  await submitDialog(page, "Liberar equipo");

  await page.goto("/activos");
  await expect(page.getByRole("row").filter({ hasText: asset.code })).toContainText(
    /AVAILABLE|Disponible/i,
  );
});

test("un equipo entregado no puede entregarse dos veces (R2)", async ({ page }) => {
  const { assets, employees } = e2eData();
  const asset = assets[1];

  await page.goto("/asignaciones");
  for (const [i, employee] of employees.entries()) {
    const dialog = await openDialog(page, "+ Entregar equipo");
    await dialog.getByLabel("Código, serie o identificador del equipo").fill(asset.code);
    await dialog
      .getByLabel(/Empleado receptor/)
      .selectOption({ label: `${employee.code} · ${employee.name}` });
    await dialog.getByLabel("Confirmo la entrega física al empleado").check();
    if (i === 0) {
      await submitDialog(page, "Confirmar entrega");
    } else {
      await dialog.getByRole("button", { name: "Confirmar entrega" }).click();
      await expect(
        dialog.getByRole("alert").filter({ hasText: /disponibilidad|asignado|no fue posible/i }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Cancelar" }).click();
    }
  }
});
