import { Pin, Code2, Sparkles, Terminal, StickyNote, Link as LinkIcon, File, Image as ImageIcon } from "lucide-react"
import { mockItems, mockItemTypes } from "@/lib/mock-data"

type Item = (typeof mockItems)[number]
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

export function ItemRow({ item, type }: { item: Item; type: ItemType }) {
  const Icon = iconMap[type.icon] ?? File
  const color = type.color
  const preview = item.description ?? item.content?.slice(0, 80) ?? item.url ?? ""

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-[var(--type-color)] transition-colors cursor-pointer"
         style={{ "--type-color": color } as React.CSSProperties}>
      <div className="mt-0.5 rounded-md p-1.5 shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
          {item.isPinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
        </div>
        {preview && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{preview}</p>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {item.language && (
          <span className="text-xs text-muted-foreground/60 font-mono">{item.language}</span>
        )}
        {item.tags.length > 0 && (
          <div className="flex gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        <span className="rounded-md px-1.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}20`, color }}>
          {type.name}
        </span>
      </div>
    </div>
  )
}
