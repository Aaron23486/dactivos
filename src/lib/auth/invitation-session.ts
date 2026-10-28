/** Minutos que tiene una cuenta invitada para crear su contraseña después de aceptar (FR-11, D12). */
export const INVITATION_PASSWORD_WINDOW_SECONDS = 15 * 60;

type AuthMethod = { method?: unknown; timestamp?: unknown };

/**
 * La página para crear contraseña solo sirve a la sesión que acaba de abrir el enlace de invitación:
 * su JWT trae `amr` con el método `otp` y la hora en que se verificó. Una sesión iniciada con
 * contraseña (`password`) no puede cambiarla aquí sin la actual (SEC-02).
 */
export function isFreshInvitationSession(
  claims: { amr?: unknown } | null | undefined,
  nowSeconds: number = Date.now() / 1000,
): boolean {
  const methods: AuthMethod[] = Array.isArray(claims?.amr) ? claims.amr : [];
  return methods.some(
    (entry) =>
      entry?.method === "otp" &&
      typeof entry.timestamp === "number" &&
      nowSeconds - entry.timestamp >= 0 &&
      nowSeconds - entry.timestamp <= INVITATION_PASSWORD_WINDOW_SECONDS,
  );
}
