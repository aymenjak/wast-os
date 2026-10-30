import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

// OWASP Password Storage Cheat Sheet lists scrypt with N=2^17, r=8, p=1 as a minimum;
// we use that and allow upgrading parameters because they are stored with the hash.
// Tests may lower N via NEXVO_FAST_HASH=1 (never set in production; see DEPLOYMENT.md).
const PARAMS = { N: process.env.NEXVO_FAST_HASH === "1" && process.env.NODE_ENV !== "production" ? 2 ** 12 : 2 ** 17, r: 8, p: 1, keylen: 32 };
const MAXMEM = 256 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, PARAMS.keylen, {
    N: PARAMS.N, r: PARAMS.r, p: PARAMS.p, maxmem: MAXMEM,
  });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !n || !r || !p || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A precomputed hash so login with an unknown email costs the same as a real check. */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
