import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "./domain/errors";

/** Storage abstraction so production can use S3-compatible object storage without touching services. */
export interface StorageProvider {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

class LocalDiskStorage implements StorageProvider {
  constructor(private readonly root: string) {}
  private resolve(key: string) {
    if (!/^[a-z0-9/_-]+$/i.test(key) || key.includes("..")) throw new Error("Invalid storage key");
    return path.join(this.root, key);
  }
  async put(key: string, bytes: Uint8Array) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, bytes, { flag: "wx" });
  }
  async get(key: string) {
    return new Uint8Array(await readFile(this.resolve(key)));
  }
}

let provider: StorageProvider | null = null;
export function storage(): StorageProvider {
  provider ??= new LocalDiskStorage(path.resolve(process.env.UPLOAD_DIR ?? "./.data/uploads"));
  return provider;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export type AllowedMime = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

/** Detect type from magic bytes. The client-declared MIME type is never trusted. */
export function sniffMime(b: Uint8Array): AllowedMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

/**
 * Removes APP1 (EXIF/XMP) and APP13 (IPTC) segments from a JPEG so citizen photos do not
 * leak device GPS coordinates or identifiers. Returns the input unchanged for non-JPEG data.
 */
export function stripJpegMetadata(b: Uint8Array): Uint8Array {
  if (!(b[0] === 0xff && b[1] === 0xd8)) return b;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break; // malformed: stop copying segments, append rest below
    const marker = b[i + 1]!;
    if (marker === 0xda) break; // start of scan: image data follows
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    const end = i + 2 + len;
    if (len < 2 || end > b.length) break;
    const drop = marker === 0xe1 || marker === 0xed;
    if (!drop) for (let j = i; j < end; j++) out.push(b[j]!);
    i = end;
  }
  const result = new Uint8Array(out.length + (b.length - i));
  result.set(out, 0);
  result.set(b.subarray(i), out.length);
  return result;
}

export type StoredFile = {
  storageKey: string;
  mimeType: AllowedMime;
  sizeBytes: number;
  sha256: string;
  originalName: string;
};

export async function storeUpload(
  file: { name: string; bytes: Uint8Array },
  opts: { prefix: string; allow: readonly AllowedMime[] },
): Promise<StoredFile> {
  if (file.bytes.length === 0) throw new DomainError("errors.upload.empty");
  if (file.bytes.length > MAX_UPLOAD_BYTES) throw new DomainError("errors.upload.tooLarge");
  const mime = sniffMime(file.bytes);
  if (!mime || !opts.allow.includes(mime)) throw new DomainError("errors.upload.type");
  const bytes = mime === "image/jpeg" ? stripJpegMetadata(file.bytes) : file.bytes;
  const storageKey = `${opts.prefix}/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}`;
  await storage().put(storageKey, bytes);
  return {
    storageKey,
    mimeType: mime,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    originalName: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "file",
  };
}

export const IMAGE_TYPES: readonly AllowedMime[] = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES: readonly AllowedMime[] = [...IMAGE_TYPES, "application/pdf"];
