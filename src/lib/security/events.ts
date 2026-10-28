import { createHash } from "node:crypto";

/** Eventos de seguridad que el servidor deja en su log (NFR-1, D13). */
export type SecurityEvent =
  | "auth.sign_in_failed"
  | "auth.sign_in_throttled"
  | "auth.access_denied"
  | "auth.invitation_rejected"
  | "report.export_blocked";

type Details = Record<string, string | number | boolean | null | undefined>;

/**
 * Identificador estable de un correo para correlacionar intentos sin escribir el correo en el log:
 * los primeros 16 caracteres hexadecimales de su SHA-256, en minúsculas.
 */
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

/**
 * Una línea JSON por evento en la salida de errores del servidor, fácil de filtrar por `type`.
 * Nunca recibe contraseñas, tokens ni correos completos.
 */
export function logSecurityEvent(event: SecurityEvent, details: Details = {}): void {
  console.warn(
    JSON.stringify({ type: "security", event, at: new Date().toISOString(), ...details }),
  );
}
