/**
 * Shrinks a phone photo before upload (pre-pilot field test: a 1 MB photo took 24 s on slow 3G). Longest side ≤ 1600 px,
 * JPEG quality 0.75 — enough for proof-of-service, typically 150–350 KB. Orientation is applied from EXIF by the browser;
 * the re-encoded file carries no EXIF at all (the server strips metadata anyway). Any failure → the original file.
 */
const MAX_SIDE = 1600;
const MIN_BYTES = 400 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < MIN_BYTES || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Replaces the selected file of an <input type="file"> with its compressed version (no-op if unsupported). */
export async function compressInputFile(input: HTMLInputElement) {
  const f = input.files?.[0];
  if (!f || typeof DataTransfer === "undefined") return;
  const smaller = await compressImage(f);
  if (smaller === f) return;
  const dt = new DataTransfer();
  dt.items.add(smaller);
  input.files = dt.files;
}
