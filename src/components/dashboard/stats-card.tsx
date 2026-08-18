import type { ReactNode } from "react"

export function StatsCard({
  title,
  value,
  sub,
  badge,
}: {
  title: string
  value: string | number
  sub: string
  /** Optional chip beside the title — e.g. a plan badge on a Pro-only stat. */
  badge?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{title}</p>
        {badge}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
