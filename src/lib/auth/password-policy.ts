import { z } from "zod";

/**
 * Password rule shared by the set-password form and the terminal commands (NFR-1). It matches the Supabase
 * Auth settings in supabase/config.toml (minimum_password_length = 12, letters_digits); 72 is the
 * longest password bcrypt can hash without truncating it.
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
