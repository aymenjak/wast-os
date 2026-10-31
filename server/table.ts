/**
 * Server-side table state from URL search params: sort column (whitelisted), direction,
 * free-text query, page and page size. URL state means views are shareable and back-button safe.
 */
export type TableState<S extends string> = { sort: S; dir: "asc" | "desc"; q: string; page: number; pageSize: number; filter: string | null };

export function tableState<S extends string>(
  sp: Record<string, string | string[] | undefined>,
  allowedSorts: readonly S[],
  defaults: { sort: S; dir?: "asc" | "desc"; pageSize?: number },
): TableState<S> {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const sort = allowedSorts.includes(one("sort") as S) ? (one("sort") as S) : defaults.sort;
  const dir = one("dir") === "asc" || one("dir") === "desc" ? (one("dir") as "asc" | "desc") : (defaults.dir ?? "asc");
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one("page") ?? "1", 10) || 1));
  const sizes = [25, 50, 100];
  const pageSize = sizes.includes(Number(one("size"))) ? Number(one("size")) : (defaults.pageSize ?? 25);
  return { sort, dir, q: (one("q") ?? "").trim().slice(0, 100), page, pageSize, filter: one("filter") ?? null };
}

export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number; pages: number };

export function pageOf<T>(rows: T[], total: number, s: { page: number; pageSize: number }): Page<T> {
  return { rows, total, page: s.page, pageSize: s.pageSize, pages: Math.max(1, Math.ceil(total / s.pageSize)) };
}

/** LIKE-safe contains for Prisma (escapes % and _). */
export function containsInsensitive(q: string) {
  return { contains: q.replace(/[\\%_]/g, (c) => `\\${c}`), mode: "insensitive" as const };
}
