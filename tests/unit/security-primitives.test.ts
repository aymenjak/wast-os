import { describe, expect, it } from "vitest";
import { can, permissionsFor } from "@/server/domain/permissions";
import { sniffMime, stripJpegMetadata } from "@/server/storage";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { hashToken, newToken, newTrackingCode } from "@/server/auth/tokens";
import { toCsv } from "@/server/services/reports";
import { haversineKm, straightLineRouting } from "@/server/routing";
import { jpegWithExif } from "../helpers/db";

describe("permissions", () => {
  it("separates business and civic capabilities by organization kind", () => {
    expect(can("OWNER", "SERVICE_PROVIDER", "invoices.write")).toBe(true);
    expect(can("OWNER", "MUNICIPALITY", "invoices.write")).toBe(false);
    expect(can("OWNER", "SERVICE_PROVIDER", "civic.review")).toBe(false);
    expect(can("CIVIC_REVIEWER", "MUNICIPALITY", "civic.review")).toBe(true);
  });
  it("least privilege for field workers and portal users", () => {
    expect([...permissionsFor("FIELD_WORKER", "SERVICE_PROVIDER")].sort()).toEqual(["workorders.execute", "workorders.read"]);
    expect([...permissionsFor("CUSTOMER_PORTAL", "SERVICE_PROVIDER")]).toEqual(["portal.access"]);
    expect(can("DISPATCHER", "SERVICE_PROVIDER", "payments.record")).toBe(false);
    expect(can("VIEWER", "SERVICE_PROVIDER", "customers.write")).toBe(false);
  });
});

describe("uploads", () => {
  it("sniffs by magic bytes, not by name", () => {
    expect(sniffMime(jpegWithExif())).toBe("image/jpeg");
    expect(sniffMime(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(sniffMime(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffMime(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
  it("strips EXIF APP1 segments but keeps image data", () => {
    const src = jpegWithExif();
    const out = stripJpegMetadata(src);
    expect(Buffer.from(out).includes(Buffer.from("GPS-LAT"))).toBe(false);
    expect(out[0]).toBe(0xff);
    expect(out[out.length - 1]).toBe(0xd9);
    expect(out.length).toBeLessThan(src.length);
  });
});

describe("credentials and tokens", () => {
  it("hashes and verifies passwords (scrypt)", async () => {
    const h = await hashPassword("correct-horse-battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct-horse-battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("tokens are random and stored hashed", () => {
    const t = newToken();
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(newToken()).not.toBe(t);
    expect(newTrackingCode()).toMatch(/^NX-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});

describe("CSV export", () => {
  it("neutralises formula injection and quotes separators", () => {
    const csv = toCsv(["a", "b"], [["=HYPERLINK(\"x\")", "Sarl, \"El Amel\""]]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"Sarl, ""El Amel"""`);
  });
});

describe("routing", () => {
  it("haversine Algiers–Oran ≈ 350 km", () => {
    expect(haversineKm({ lat: 36.7538, lng: 3.0588 }, { lat: 35.6971, lng: -0.6308 })).toBeGreaterThan(340);
  });
  it("nearest neighbour orders stops and reports unlocated ones", async () => {
    const r = await straightLineRouting.plan({ lat: 0, lng: 0 }, [
      { id: "far", lat: 0, lng: 3 },
      { id: "near", lat: 0, lng: 1 },
      { id: "x", lat: null, lng: null },
      { id: "mid", lat: 0, lng: 2 },
    ]);
    expect(r.order).toEqual(["near", "mid", "far"]);
    expect(r.unlocated).toEqual(["x"]);
  });
});
