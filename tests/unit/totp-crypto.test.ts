import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, totpAt, verifyTotp } from "@/server/auth/totp";
import { decryptSecret, encryptSecret } from "@/server/crypto";

describe("TOTP (RFC 6238 test vectors, SHA-1)", () => {
  // RFC 6238 Appendix B secret "12345678901234567890"; 8-digit vectors truncated to 6 digits.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it.each([
    [59, "287082"], [1111111109, "081804"], [1111111111, "050471"], [1234567890, "005924"], [2000000000, "279037"],
  ])("time %i → %s", (t, code) => {
    expect(totpAt(secret, Math.floor(t / 30))).toBe(code);
  });

  it("base32 round-trips", () => {
    const b = Buffer.from([0, 1, 2, 250, 255, 9]);
    expect(base32Decode(base32Encode(b))).toEqual(b);
  });

  it("accepts ±1 step, rejects replays and garbage", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30000);
    expect(verifyTotp(secret, totpAt(secret, step), null, now)).toBe(step);
    expect(verifyTotp(secret, totpAt(secret, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(secret, totpAt(secret, step - 2), null, now)).toBeNull();
    expect(verifyTotp(secret, totpAt(secret, step), step, now)).toBeNull();
    expect(verifyTotp(secret, "12345", null, now)).toBeNull();
    expect(verifyTotp(secret, "abcdef", null, now)).toBeNull();
  });
});

describe("secret encryption", () => {
  it("round-trips, is randomized and tamper-evident", () => {
    const a = encryptSecret("sk_test_synthetic");
    expect(a).not.toContain("sk_test");
    expect(encryptSecret("sk_test_synthetic")).not.toBe(a);
    expect(decryptSecret(a)).toBe("sk_test_synthetic");
    const parts = a.split(".");
    parts[3] = parts[3]!.slice(0, -2) + (parts[3]!.endsWith("A") ? "BB" : "AA");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});
