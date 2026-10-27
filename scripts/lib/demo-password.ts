import { randomInt } from "node:crypto";
import { newPasswordSchema } from "../../src/lib/auth/password-policy.ts";

// No characters that are easy to confuse when copied by hand (0/O, 1/l/I).
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUPS = 4;
const GROUP_LENGTH = 4;

/**
 * Random password for a demo account, for example "k7Rm-x2Qa-Hp9d-Wn4e" (16 random characters,
 * about 93 bits). It always satisfies the password rule.
 */
export function generateDemoPassword(): string {
  for (;;) {
    const password = Array.from({ length: GROUPS }, () =>
      Array.from({ length: GROUP_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
    ).join("-");
    if (newPasswordSchema.safeParse(password).success) return password;
  }
}
