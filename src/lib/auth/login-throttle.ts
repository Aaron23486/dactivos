/**
 * Límite de intentos de inicio de sesión, en la memoria de este servidor (NFR-1, D10).
 *
 * Supabase Auth también limita por IP, pero todas las solicitudes le llegan desde este servidor, así
 * que ese límite lo comparten todos los usuarios. Aquí los límites son por IP del cliente y por correo:
 * - se rechazan más de LOGIN_ATTEMPTS_PER_MINUTE intentos de una IP en un minuto;
 * - tras LOGIN_MAX_FAILURES fallos seguidos, un correo queda bloqueado LOGIN_LOCKOUT_MINUTES.
 * Ambos responden con el mismo mensaje, exista o no la cuenta.
 */
export const LOGIN_ATTEMPTS_PER_MINUTE = 10;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

const MINUTE = 60_000;
const MAX_TRACKED = 10_000;

type Window = { count: number; startedAt: number };
type Failures = { count: number; lockedUntil: number };

export class LoginThrottle {
  private readonly ipWindows = new Map<string, Window>();
  private readonly failures = new Map<string, Failures>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Registra un intento e indica si puede continuar. */
  allow(ip: string, email: string): boolean {
    const now = this.now();
    const lock = this.failures.get(email);
    if (lock && lock.lockedUntil > now) return false;

    const window = this.ipWindows.get(ip);
    if (!window || now - window.startedAt >= MINUTE) {
      this.remember(this.ipWindows, ip, { count: 1, startedAt: now });
      return true;
    }
    window.count++;
    return window.count <= LOGIN_ATTEMPTS_PER_MINUTE;
  }

  recordFailure(email: string): void {
    const now = this.now();
    const current = this.failures.get(email);
    const count = current && current.lockedUntil <= now ? current.count + 1 : 1;
    this.remember(this.failures, email, {
      count: count >= LOGIN_MAX_FAILURES ? 0 : count,
      lockedUntil: count >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCKOUT_MINUTES * MINUTE : 0,
    });
  }

  recordSuccess(email: string): void {
    this.failures.delete(email);
  }

  /** Memoria acotada: olvida la entrada más antigua en vez de crecer sin límite. */
  private remember<T>(map: Map<string, T>, key: string, value: T): void {
    map.delete(key);
    if (map.size >= MAX_TRACKED) map.delete(map.keys().next().value!);
    map.set(key, value);
  }
}

export const loginThrottle = new LoginThrottle();
