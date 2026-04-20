import Link from "next/link"
import { Star, Code2, Sparkles, Terminal, StickyNote, Link as LinkIcon, File, Image as ImageIcon } from "lucide-react"
import { mockCollections, mockItemTypes } from "@/lib/mock-data"

type Collection = (typeof mockCollections)[number]
type ItemType = (typeof mockItemTypes)[number]

const iconMap: Record<string, React.ElementType> = {
  Code: Code2,
  Sparkles,
  Terminal,
  StickyNote,
  Link: LinkIcon,
  File,
  Image: ImageIcon,
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 172800) return "Yesterday"
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

export function CollectionCard({ collection, type }: { collection: Collection; type: ItemType }) {
  const Icon = iconMap[type.icon] ?? File
  const color = type.color

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group flex flex-col rounded-xl border border-border overflow-hidden hover:border-[var(--type-color)] transition-colors"
      style={{ "--type-color": color } as React.CSSProperties}
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: color }} />
      <div
        className="flex flex-col flex-1 p-4"
        style={{ background: `linear-gradient(135deg, ${color}28 0%, ${color}08 40%, transparent 70%)` }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          {collection.isFavorite && (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          )}
        </div>

        <h3 className="font-semibold text-foreground leading-snug">{collection.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 flex-1">
          {collection.description}
        </p>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span>{collection.itemCount} items</span>
          <span className="ml-auto">Updated {relativeTime(collection.updatedAt)}</span>
        </div>
      </div>
    </Link>
  )
}
