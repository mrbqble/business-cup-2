import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** A new secret player token; only its hash is stored. */
export function newPlayerToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The token from an `Authorization: Bearer <token>` header, or null. */
export function bearerToken(headers: Headers): string | null {
  const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(headers.get("authorization") ?? "");
  return match ? match[1] : null;
}
