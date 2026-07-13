// Upload constraints for the two file-backed item types (file, image).
//
// Validation is by **extension + size**: browser-reported MIME types are
// unreliable for developer doc formats (.md, .yaml, .toml, .ini, .csv often
// arrive empty or mislabeled), so the extension allow-list is authoritative.
// The extension→MIME map is used to set the Content-Type we serve back.

export type UploadKind = "file" | "image"

export interface FileConstraint {
  /** Max upload size in bytes. */
  maxSize: number
  /** Allowed lowercase extensions, including the leading dot. */
  extensions: string[]
}

export const IMAGE_CONSTRAINT: FileConstraint = {
  maxSize: 5 * 1024 * 1024, // 5 MB
  extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
}

export const FILE_CONSTRAINT: FileConstraint = {
  maxSize: 10 * 1024 * 1024, // 10 MB
  extensions: [".pdf", ".txt", ".md", ".json", ".yaml", ".yml", ".xml", ".csv", ".toml", ".ini"],
}

// Extension → Content-Type used when serving the file back through the proxy.
const EXTENSION_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".yaml": "application/x-yaml",
  ".yml": "application/x-yaml",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".toml": "application/toml",
  ".ini": "text/plain",
}

export function getConstraint(kind: UploadKind): FileConstraint {
  return kind === "image" ? IMAGE_CONSTRAINT : FILE_CONSTRAINT
}

/** Lowercased extension including the leading dot, or "" if none. */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  if (dot <= 0 || dot === fileName.length - 1) return ""
  return fileName.slice(dot).toLowerCase()
}

/** Content-Type to serve for a file name, defaulting to octet-stream. */
export function contentTypeForFile(fileName: string): string {
  return EXTENSION_MIME[extensionOf(fileName)] ?? "application/octet-stream"
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

/**
 * Validate an upload's extension and size against the constraints for its kind.
 * Returns a user-facing error message on failure.
 */
export function validateUpload(
  kind: UploadKind,
  fileName: string,
  size: number
): ValidationResult {
  const constraint = getConstraint(kind)
  const ext = extensionOf(fileName)

  if (!ext || !constraint.extensions.includes(ext)) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${constraint.extensions.join(", ")}`,
    }
  }

  if (size > constraint.maxSize) {
    return {
      ok: false,
      error: `File is too large (max ${formatSize(constraint.maxSize)}).`,
    }
  }

  return { ok: true }
}
