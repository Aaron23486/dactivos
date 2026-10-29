import { z } from "zod";

/**
 * Regla de contraseñas que comparten el formulario de contraseña y los comandos de terminal (NFR-1).
 * Coincide con la configuración de Auth en supabase/config.toml (minimum_password_length = 12,
 * letters_digits); 72 es la contraseña más larga que bcrypt procesa sin truncarla.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "La contraseña debe combinar letras y números.",
  });
