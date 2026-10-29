import { expect, test, type Browser } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { e2eData, openDialog, signInThroughForm, storageFile, submitDialog } from "./support.ts";

// Invitación completa (FR-11, ADR 0006, D12): ADMIN invita, la persona acepta desde el correo,
// crea su contraseña, queda inactiva hasta que ADMIN la habilita y entonces puede iniciar sesión.

function mailpitUrl(): string {
  const status = execFileSync("npx", ["--no-install", "supabase", "status", "-o", "json"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const parsed = JSON.parse(status.slice(status.indexOf("{"))) as Record<string, string>;
  return parsed.MAILPIT_URL ?? parsed.INBUCKET_URL;
}

async function invitationLink(email: string): Promise<string> {
  const mailpit = mailpitUrl();
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length) {
      const message = (await (
        await fetch(`${mailpit}/api/v1/message/${messages[0].ID}`)
      ).json()) as {
        HTML: string;
      };
      const href = message.HTML.match(/href="([^"]+)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó la invitación para ${email}`);
}

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

test("una persona invitada crea su contraseña y entra solo cuando ADMIN la habilita (FR-11, D6, D12)", async ({
  browser,
}) => {
  const { run } = e2eData();
  const email = `${run.toLowerCase()}-invitada@e2e.dactivos.test`;
  const password = "InvitadaE2E2026x";

  const admin = await (await browser.newContext({ storageState: storageFile("ADMIN") })).newPage();
  await admin.goto("/usuarios");
  const invite = await openDialog(admin, "+ Invitar usuario");
  await invite.getByLabel(/Correo electrónico/).fill(email);
  await invite.getByLabel(/Rol inicial/).selectOption("SECURITY");
  await invite.getByLabel(/Justificación auditada/).fill("Ingreso de personal de prueba e2e.");
  await invite.getByLabel("Confirmo la invitación y la asignación del rol").check();
  await submitDialog(admin, "Enviar invitación");

  // La persona abre el enlace: el token solo se consume al pulsar el botón.
  const invited = await freshPage(browser);
  // The email uses the Auth site URL (port 3000 in supabase/config.toml); the tests run on their
  // own port, so only the path and the token are kept.
  const link = new URL(await invitationLink(email));
  await invited.goto(link.pathname + link.search);
  await invited.getByRole("button", { name: "Aceptar invitación" }).click();
  await invited.getByLabel("Nueva contraseña").fill(password);
  await invited.getByLabel("Confirmar contraseña").fill(password);
  await invited.getByRole("button", { name: /Guardar contraseña/ }).click();
  await expect(invited.getByRole("heading", { name: "Contraseña configurada" })).toBeVisible();

  // Con el perfil inactivo, iniciar sesión no da acceso al sistema.
  await invited.goto("/login");
  await invited.getByLabel("Correo electrónico").fill(email);
  await invited.getByLabel("Contraseña").fill(password);
  await invited.getByRole("button", { name: "Ingresar a Dactivos" }).click();
  await expect(invited).toHaveURL(/\/acceso-denegado/);

  // ADMIN la habilita con un motivo.
  await admin.reload();
  const row = admin.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Gestionar acceso" }).click();
  const access = admin.getByRole("dialog");
  await access.getByLabel(/^Rol/).selectOption("SECURITY");
  await access.getByLabel(/^Estado/).selectOption("true");
  await access
    .getByLabel(/Justificación para auditoría/)
    .fill("Habilitación tras la invitación e2e.");
  await access.getByLabel("Confirmo que revisé el rol y el estado de esta cuenta").check();
  await submitDialog(admin, "Guardar acceso");

  const enabled = await freshPage(browser);
  await signInThroughForm(enabled, { email, password });
  await expect(enabled.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
