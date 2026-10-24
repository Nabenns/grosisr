export type SortDir = "asc" | "desc"

type OrderByFactory<T> = (dir: SortDir) => T

/**
 * Bangun orderBy dari URL search params (sortBy/sortDir) dengan whitelist kolom.
 * Whitelist mencegah error Prisma + injeksi nama kolom sembarang.
 */
export function orderByFrom<T>(
  sortBy: string | undefined,
  sortDir: string | undefined,
  columns: Record<string, OrderByFactory<T>>,
  fallback: T
): T {
  const dir: SortDir = sortDir === "desc" ? "desc" : "asc"
  const factory = sortBy ? columns[sortBy] : undefined
  return factory ? factory(dir) : fallback
}
