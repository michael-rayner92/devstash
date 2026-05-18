# Item Types

DevStash has 7 system item types. System types are seeded at migration (`isSystem: true`, `userId: null`) and cannot be edited or deleted by users.

---

## Type Reference

### Snippet

| Property | Value |
|---|---|
| Name | `snippet` |
| Icon | `Code` → `Code2` (lucide-react) |
| Color | `#3b82f6` (blue) |
| ContentType | `text` |
| Tier | Free |

**Purpose:** Reusable code blocks. The primary type for storing code patterns, utilities, hooks, and boilerplate.

**Key fields used:**
- `content` — the code body (`@db.Text`)
- `language` — syntax highlighting hint (e.g. `"typescript"`, `"dockerfile"`)
- `title`, `description`, `tags`

---

### Prompt

| Property | Value |
|---|---|
| Name | `prompt` |
| Icon | `Sparkles` (lucide-react) |
| Color | `#8b5cf6` (purple) |
| ContentType | `text` |
| Tier | Free |

**Purpose:** AI prompts, system messages, and workflow templates for use with LLMs.

**Key fields used:**
- `content` — the prompt body (`@db.Text`), may include `{PLACEHOLDER}` variables
- `title`, `description`, `tags`
- `language` not typically set

---

### Command

| Property | Value |
|---|---|
| Name | `command` |
| Icon | `Terminal` (lucide-react) |
| Color | `#f97316` (orange) |
| ContentType | `text` |
| Tier | Free |

**Purpose:** Shell and CLI commands for everyday development tasks — git, docker, npm, etc.

**Key fields used:**
- `content` — the command string (`@db.Text`)
- `title`, `description`, `tags`
- `language` not typically set (commands are short single-line strings)

---

### Note

| Property | Value |
|---|---|
| Name | `note` |
| Icon | `StickyNote` (lucide-react) |
| Color | `#fde047` (yellow) |
| ContentType | `text` |
| Tier | Free |

**Purpose:** Free-form text notes, markdown-formatted documentation, or quick reference material.

**Key fields used:**
- `content` — markdown body (`@db.Text`)
- `title`, `description`, `tags`
- `language` not used

---

### Link

| Property | Value |
|---|---|
| Name | `link` |
| Icon | `Link` → `LinkIcon` (lucide-react) |
| Color | `#10b981` (emerald) |
| ContentType | `url` |
| Tier | Free |

**Purpose:** Saved URLs — documentation, references, tools, and bookmarks.

**Key fields used:**
- `url` — the saved URL
- `title`, `description`, `tags`
- `content`, `language`, `fileUrl`, `fileName`, `fileSize` are `null`

---

### File

| Property | Value |
|---|---|
| Name | `file` |
| Icon | `File` (lucide-react) |
| Color | `#6b7280` (gray) |
| ContentType | `file` |
| Tier | **Pro** |

**Purpose:** Uploaded files — context files, PDFs, configs, templates. Stored in Cloudflare R2.

**Key fields used:**
- `fileUrl` — Cloudflare R2 URL
- `fileName` — original filename
- `fileSize` — size in bytes
- `title`, `description`, `tags`
- `content`, `url` are `null`

---

### Image

| Property | Value |
|---|---|
| Name | `image` |
| Icon | `Image` → `ImageIcon` (lucide-react) |
| Color | `#ec4899` (pink) |
| ContentType | `file` |
| Tier | **Pro** |

**Purpose:** Uploaded images — screenshots, diagrams, mockups. Stored in Cloudflare R2.

**Key fields used:**
- `fileUrl` — Cloudflare R2 URL
- `fileName` — original filename
- `fileSize` — size in bytes
- `title`, `description`, `tags`
- `content`, `url` are `null`

---

## Classifications

### By ContentType

| ContentType | Types |
|---|---|
| `text` | snippet, prompt, command, note |
| `file` | file, image |
| `url` | link |

The `ContentType` enum drives which payload fields are populated on an `Item`:
- `text` → `content` field is set; `fileUrl`/`url` are `null`
- `file` → `fileUrl`, `fileName`, `fileSize` are set; `content`/`url` are `null`
- `url` → `url` field is set; `content`/`fileUrl` are `null`

### By Tier

| Tier | Types |
|---|---|
| Free | snippet, prompt, command, note, link |
| Pro | file, image |

File and image types require Pro because they use Cloudflare R2 storage.

---

## Shared Properties

All item types share these fields regardless of content classification:

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | cuid |
| `title` | `String` | required |
| `description` | `String?` | optional subtitle |
| `contentType` | `ContentType` | enum: `text`, `file`, `url` |
| `isFavorite` | `Boolean` | default `false` |
| `isPinned` | `Boolean` | default `false` |
| `tags` | `Tag[]` | many-to-many |
| `collections` | `ItemCollection[]` | many-to-many |
| `userId` | `String` | owner |
| `itemTypeId` | `String` | FK to `ItemType` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

---

## Display Differences

| Aspect | text types | file types | url types |
|---|---|---|---|
| Body display | Markdown / syntax-highlighted code block | File preview or download link | Clickable URL with favicon |
| `language` field | Used for syntax highlighting (snippets/commands) | Not used | Not used |
| Create UI | Markdown editor or plain textarea | File upload input | URL input field |
| Item card preview | Content excerpt | Filename + file size | Domain name |
| Border color | Type hex color | Type hex color | Type hex color |

The `language` field is most relevant for `snippet` and `command` types. `note` and `prompt` items are treated as plain markdown regardless of `language`.

---

## Icon Map

Icons are stored in the DB as string names and resolved at runtime via `src/lib/icon-map.ts`:

```ts
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
```

The DB stores the key (e.g. `"Code"`) and UI components look up the React component via `iconMap[itemType.icon]`.
