import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { getPageNumbers } from "@/lib/pagination"

interface PaginationProps {
  currentPage: number
  totalPages: number
  /** Route the page links point at, e.g. `/items/snippets`. Page 1 omits `?page`. */
  basePath: string
}

const linkBase =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border border-input px-3 text-sm font-medium transition-colors"

function hrefForPage(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`
}

/**
 * Numbered page navigation with prev/next links. Prev/next are greyed out and
 * non-interactive at the first/last page. Renders nothing for a single page.
 */
export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)
  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 pt-2"
    >
      {isFirst ? (
        <span
          aria-disabled="true"
          className={cn(linkBase, "cursor-not-allowed text-muted-foreground opacity-50")}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </span>
      ) : (
        <Link
          href={hrefForPage(basePath, currentPage - 1)}
          rel="prev"
          className={cn(linkBase, "hover:bg-accent hover:text-accent-foreground")}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Link>
      )}

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm text-muted-foreground"
          >
            &hellip;
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            aria-current="page"
            className={cn(linkBase, "border-primary bg-primary text-primary-foreground")}
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={hrefForPage(basePath, p)}
            className={cn(linkBase, "hover:bg-accent hover:text-accent-foreground")}
          >
            {p}
          </Link>
        )
      )}

      {isLast ? (
        <span
          aria-disabled="true"
          className={cn(linkBase, "cursor-not-allowed text-muted-foreground opacity-50")}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link
          href={hrefForPage(basePath, currentPage + 1)}
          rel="next"
          className={cn(linkBase, "hover:bg-accent hover:text-accent-foreground")}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}
