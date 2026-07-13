import type { ElementType } from "react"
import { FileText, FileJson, FileCode, FileSpreadsheet, FileCog } from "lucide-react"

/** Lucide icon keyed by file extension (including leading dot). Look up with `extensionOf()`. */
export const EXTENSION_ICON: Record<string, ElementType> = {
  ".pdf": FileText,
  ".txt": FileText,
  ".md": FileText,
  ".json": FileJson,
  ".yaml": FileCode,
  ".yml": FileCode,
  ".xml": FileCode,
  ".toml": FileCode,
  ".csv": FileSpreadsheet,
  ".ini": FileCog,
}
