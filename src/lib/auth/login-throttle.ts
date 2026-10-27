/**
 * Sign-in throttling, kept in this server's memory.
 *
 * Supabase Auth also limits sign-ins per IP, but every request reaches it from this server, so its
 * limit is shared by all users. Here the limits apply per client IP and per email:
 * - more than LOGIN_ATTEMPTS_PER_MINUTE attempts from one IP within a minute are refused;
 * - after LOGIN_MAX_FAILURES consecutive failures an email is locked for LOGIN_LOCKOUT_MINUTES.
 * Both answer with the same message whether or not the account exists.
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

  /** Records an attempt and says whether it may proceed. */
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

  /** Bounded memory: forget the oldest entry instead of growing without limit. */
  private remember<T>(map: Map<string, T>, key: string, value: T): void {
    map.delete(key);
    if (map.size >= MAX_TRACKED) map.delete(map.keys().next().value!);
    map.set(key, value);
  }
}

export const loginThrottle = new LoginThrottle();
