import { createHash, randomBytes } from "node:crypto";

/** 256-bit random token, URL-safe. Only its SHA-256 hash is stored. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const TRACKING_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

/** Citizen tracking code, e.g. "NX-7K4M-Q9TR-2WHD". ~60 bits of entropy; acts as a bearer secret. */
export function newTrackingCode(): string {
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += TRACKING_ALPHABET[bytes[i]! % TRACKING_ALPHABET.length];
  return `NX-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}
