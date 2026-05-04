import type { ElementType } from "react"
import { Code2, Sparkles, Terminal, StickyNote, Link as LinkIcon, File, Image as ImageIcon } from "lucide-react"

export const iconMap: Record<string, ElementType> = {
  Code: Code2,
  Sparkles,
  Terminal,
  StickyNote,
  Link: LinkIcon,
  File,
  Image: ImageIcon,
}
