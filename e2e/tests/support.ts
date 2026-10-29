import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const AUTH_DIR = resolve(import.meta.dirname, "..", ".auth");
export const dataFile = resolve(AUTH_DIR, "data.json");
export const storageFile = (role: "ADMIN" | "SECURITY") =>
  resolve(AUTH_DIR, `${role.toLowerCase()}.json`);

export type Account = { email: string; password: string };
export type E2EData = {
  run: string;
  /** SIGN_OUT is a separate SECURITY account: signing out ends every session of an account. */
  accounts: Record<"ADMIN" | "SECURITY" | "SIGN_OUT", Account>;
  employees: { code: string; name: string }[];
  assets: { code: string; name: string }[];
};

/** Cuentas y datos que preparó global-setup.ts para esta ejecución. */
export function e2eData(): E2EData {
  return JSON.parse(readFileSync(dataFile, "utf8")) as E2EData;
}

export async function signInThroughForm(page: Page, account: Account): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña").fill(account.password);
  await page.getByRole("button", { name: "Ingresar a Dactivos" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Abre un diálogo de acción por su botón y devuelve el diálogo. */
export async function openDialog(page: Page, trigger: string | RegExp) {
  await page.getByRole("button", { name: trigger }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Espera a que la acción termine: el diálogo se cierra al confirmar la operación. */
export async function submitDialog(page: Page, submit: string | RegExp): Promise<void> {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: submit }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}
