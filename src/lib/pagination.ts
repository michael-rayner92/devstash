// Per-page counts for the paginated listing pages.
export const ITEMS_PER_PAGE = 21
export const COLLECTIONS_PER_PAGE = 21

// Fixed limits for the dashboard's "recent" sections (not paginated).
export const DASHBOARD_COLLECTIONS_LIMIT = 6
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10

/**
 * Parse a `?page=` search param into a positive integer page number. Anything
 * missing, non-numeric, non-integer, or < 1 falls back to page 1.
 */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return 1
  return n
}

export type PageMeta = {
  /** The clamped current page — always within `[1, totalPages]`. */
  page: number
  totalPages: number
  /** Rows to skip for the current page (for Prisma `skip`). */
  skip: number
  /** Rows to take per page (for Prisma `take`). */
  take: number
}

/**
 * Derive pagination bounds from a total count. `requestedPage` is clamped into
 * range so an out-of-range URL (e.g. `?page=999`) resolves to the last page
 * rather than an empty result. Always yields at least one page.
 */
export function getPageMeta(
  totalCount: number,
  perPage: number,
  requestedPage: number
): PageMeta {
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  return { page, totalPages, skip: (page - 1) * perPage, take: perPage }
}

/**
 * Build the sequence of page numbers to render, collapsing gaps to "ellipsis".
 * Always includes the first page, the last page, and a window around the
 * current page. Returns `[]` for zero pages.
 *
 * e.g. current=5, total=10 → [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
 */
export function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return total === 1 ? [1] : []

  const wanted = new Set<number>([1, total, current - 1, current, current + 1])
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const result: (number | "ellipsis")[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("ellipsis")
    result.push(p)
    prev = p
  }
  return result
}
