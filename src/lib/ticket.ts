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
