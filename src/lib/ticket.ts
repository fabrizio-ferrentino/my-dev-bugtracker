import { randomBytes, randomUUID } from "crypto";

/** Internal primary key. */
export function newBugId(): string {
  return randomUUID();
}

/**
 * Long random token granting read access to a single ticket's public info
 * (spec §19). Returned once at creation time inside the success-page link.
 */
export function newPublicAccessToken(): string {
  return randomBytes(32).toString("hex"); // 64 chars
}

/**
 * Crockford alphabet: 32 symbols, no I, L, O, U (easily confused with 1, 0, V).
 * 32 is a power of 2, so `byte & 31` is uniform.
 */
const TICKET_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Public ticket number, e.g. BUG-7K3M-Q9TD: 8 random symbols (~1.1 × 10¹²
 * combinations), so nobody can find someone else's ticket by trying numbers.
 */
export function newTicketNumber(): string {
  const chars = Array.from(randomBytes(8), (b) => TICKET_ALPHABET[b & 31]).join("");
  return `BUG-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/**
 * Forgiving lookup: lowercase, spaces, missing dashes and look-alike letters
 * (O → 0, I/L → 1). "bug 7k3m q9td" → "BUG-7K3M-Q9TD".
 */
export function normalizeTicketNumber(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact.startsWith("BUG")) return raw.trim().toUpperCase();
  const body = compact.slice(3).replace(/O/g, "0").replace(/[IL]/g, "1");
  return body.length === 8 ? `BUG-${body.slice(0, 4)}-${body.slice(4)}` : raw.trim().toUpperCase();
}
