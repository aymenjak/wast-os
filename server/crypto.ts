import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { DomainError } from "./domain/errors";

/**
 * AES-256-GCM for secrets at rest (TOTP secrets, organizations' payment keys).
 * Key: APP_ENCRYPTION_KEY = 32 random bytes, base64. Fails closed: without a valid key nothing is encrypted or decrypted.
 * Format: v1.<iv>.<tag>.<ciphertext> (base64url).
 */
function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  const k = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (k.length !== 32) throw new DomainError("errors.config.encryptionKey");
  return k;
}

export function encryptionConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptSecret(token: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Malformed secret");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
