# Item CRUD Architecture

Design for the unified CRUD system across all 7 item types.

---

## Core Principle

The item model has three content classifications (`text`, `file`, `url`) but 7 types. The architecture keeps mutations in a single action file and isolates type-specific rendering in components — actions stay content-type-aware, not type-name-aware.

---

## File Structure

```
src/
├── actions/
│   └── items.ts                    # create, update, delete, toggle favorite/pin
│
├── lib/db/
│   └── items.ts                    # all read queries (extended from current file)
│
├── app/
│   └── dashboard/
│       └── items/
│           └── [type]/
│               └── page.tsx        # item list page (server component)
│
├── components/
│   └── items/
│       ├── item-grid.tsx           # grid layout of ItemCard components
│       ├── item-card.tsx           # single item card (type-colored, click to open drawer)
│       ├── item-drawer.tsx         # drawer shell (create / view / edit modes)
│       ├── item-form.tsx           # create/edit form — fields switch by contentType
│       ├── item-detail.tsx         # read-only view — rendering switches by contentType
│       └── item-content.tsx        # renders content payload (code block / URL / file)
│
└── types/
    └── items.ts                    # shared item-related types
```

---

## Routing

### URL pattern

The sidebar generates item type URLs as:

```
/items/${type.name}s   →   /items/snippets, /items/prompts, /items/commands …
```

These routes live inside the dashboard layout so they inherit the sidebar, topbar, and auth:

```
src/app/dashboard/items/[type]/page.tsx
```

The proxy matcher in `src/proxy.ts` already protects `"/dashboard/:path*"`, so no additional auth config is needed.

**Note:** The sidebar currently generates `/items/[type]s` (without the `/dashboard` prefix). This needs updating to `/dashboard/items/[type]s` when the route is implemented.

### Slug → type name

The URL slug is the plural form. The singular type name is derived as:

```ts
const typeName = params.type.slice(0, -1)  // "snippets" → "snippet"
```

This works for all 7 system types. The page uses `typeName` to query `ItemType` from the DB.

---

## Data Fetching (`src/lib/db/items.ts`)

Server components call these directly — no API layer needed.

```ts
// Existing
getPinnedItems(userId: string): Promise<ItemWithType[]>
getRecentItems(userId: string, limit?: number): Promise<ItemWithType[]>

// New
getItemsByType(userId: string, typeName: string): Promise<ItemWithType[]>
getItemById(userId: string, itemId: string): Promise<ItemWithType | null>
```

**`ItemWithType`** (already defined in `src/lib/db/items.ts`):

```ts
type ItemWithType = Item & {
  itemType: ItemType
  tags: Tag[]
}
```

The `[type]/page.tsx` fetches in parallel where possible:

```ts
const [itemType, items] = await Promise.all([
  prisma.itemType.findFirst({ where: { name: typeName, isSystem: true } }),
  getItemsByType(userId, typeName),
])
```

---

## Mutations (`src/actions/items.ts`)

One file for all item mutations. The `contentType` is passed as a hidden field from the form — the action does not re-fetch the item type to determine it.

### Return type

All actions return `{ success: true } | { error: string }` (existing project convention).

### Zod schema

A discriminated union on `contentType` validates only the relevant payload fields:

```ts
const baseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  itemTypeId: z.string().cuid(),
  tags: z.string().optional(),          // comma-separated, parsed in action
})

const textSchema = baseSchema.extend({
  contentType: z.literal("text"),
  content: z.string().min(1),
  language: z.string().optional(),
})

const urlSchema = baseSchema.extend({
  contentType: z.literal("url"),
  url: z.string().url(),
})

const fileSchema = baseSchema.extend({
  contentType: z.literal("file"),
  fileUrl: z.string().url(),
  fileName: z.string().min(1),
  fileSize: z.coerce.number().int().positive(),
})

const itemSchema = z.discriminatedUnion("contentType", [
  textSchema,
  urlSchema,
  fileSchema,
])
```

### Functions

```ts
export async function createItem(formData: FormData): Promise<ActionResult>
export async function updateItem(id: string, formData: FormData): Promise<ActionResult>
export async function deleteItem(id: string): Promise<ActionResult>
export async function toggleFavorite(id: string): Promise<ActionResult>
export async function togglePinned(id: string): Promise<ActionResult>
```

Each function:
1. Calls `auth()` — returns `{ error: "Not authenticated" }` if no session
2. Parses with `itemSchema.safeParse(...)` — returns `{ error }` on failure
3. Writes to DB, scoped to `userId` on all queries to prevent horizontal privilege escalation
4. Returns `{ success: true }` on completion

---

## Page Structure (`src/app/dashboard/items/[type]/page.tsx`)

Server component. Resolves type from slug, fetches items, renders the list with a "New item" button that opens the drawer.

```tsx
export default async function ItemTypePage({ params }: { params: { type: string } }) {
  const session = await auth()
  const typeName = params.type.slice(0, -1)             // "snippets" → "snippet"

  const [itemType, items] = await Promise.all([
    prisma.itemType.findFirst({ where: { name: typeName, isSystem: true } }),
    getItemsByType(session.user.id, typeName),
  ])

  if (!itemType) notFound()

  return <ItemGrid itemType={itemType} items={items} />
}
```

---

## Component Responsibilities

### `ItemGrid` (server component)

Renders a heading row (type name, icon, count, "New item" button) and a responsive card grid. Receives `ItemType` and `ItemWithType[]` as props — no data fetching.

### `ItemCard` (server component or client)

Single item card with type-colored left border or top accent line. Clicking opens `ItemDrawer` in view mode. Shows:
- Type icon (colored)
- Title
- Preview: `description` → `content.slice(0, 80)` → `url` → `fileName` (first non-null)
- Tags (first 2, "+N more" if overflow)
- `language` badge (for text types with language set)
- Relative time

### `ItemDrawer` ('use client')

Radix `Sheet` component. Three modes driven by local state:
- `view` — renders `ItemDetail`
- `edit` — renders `ItemForm` pre-populated with current item values
- `create` — renders `ItemForm` with empty fields

Triggered by:
- Clicking an `ItemCard` → opens in `view` mode
- "New item" button on the page → opens in `create` mode
- "Edit" button inside the drawer → switches from `view` to `edit`

### `ItemForm` ('use client')

Create/edit form. Receives `itemType: ItemType` and optional `item: ItemWithType` (for edit pre-fill). Uses `useActionState` to call `createItem` or `updateItem`.

Renders fields based on `itemType.contentType`:

| contentType | Fields shown |
|---|---|
| `text` | `content` (markdown/code textarea), `language` (select, optional) |
| `url` | `url` (text input) |
| `file` | File upload input — resolves to `fileUrl`, `fileName`, `fileSize` |

All modes share: `title` (required), `description` (optional), `tags` (comma-separated input).

A hidden `<input name="contentType">` carries the `ContentType` enum value so the action's discriminated union schema can parse without a DB round-trip.

### `ItemDetail` (server component or client)

Read-only view of a single item. Header shows icon, type badge, title, favorite/pin toggle buttons. Body delegates to `ItemContent`.

### `ItemContent`

Renders the content payload differently per `contentType`:

| contentType | Rendering |
|---|---|
| `text` | Syntax-highlighted code block (when `language` is set) or markdown prose |
| `url` | Clickable URL, domain favicon, optional description below |
| `file` | Filename, file size, download button; image types render an `<img>` preview |

---

## Where Type-Specific Logic Lives

**In components, not in actions.**

| Concern | Location |
|---|---|
| Which fields to show in the form | `ItemForm` — switches on `contentType` |
| How to render content | `ItemContent` — switches on `contentType` |
| Which icon/color to use | Any component — reads `item.itemType.icon` and `.color` |
| Pro gate (file/image upload) | `ItemForm` — checks `session.user.isPro` before rendering file input |
| Validation rules per type | `items.ts` action — discriminated union schema |

Actions are content-type-aware (they validate the right payload fields) but they do not contain any rendering logic or type-name-specific branches.

---

## Tags

Tags are stored per-user (`Tag` model, `@@unique([userId, name])`). The form accepts a comma-separated string. The action:

1. Splits and trims the tag string
2. Upserts each tag with `{ where: { userId_name }, create: { name, userId } }`
3. Passes the resulting tag IDs to the item relation

On update, the action does a full replace: disconnect all existing tags, connect the new set.

---

## Auth & Ownership

Every DB query in both `lib/db/items.ts` and `src/actions/items.ts` is scoped with `userId`:

```ts
// Reads
prisma.item.findMany({ where: { userId, ... } })

// Writes
prisma.item.update({ where: { id, userId } })  // userId in WHERE prevents takeover
```

This ensures a user can never read or mutate another user's items even if they know the `id`.

---

## Open Questions

- **File uploads:** The `file` and `image` content types require a Cloudflare R2 upload before `createItem` is called. The upload flow (client → R2 pre-signed URL → resolve `fileUrl`) is a separate concern and should be documented when R2 integration is implemented.
- **Markdown editor:** `note` and `prompt` items benefit from a rich markdown editor. A library choice (e.g. `@uiw/react-md-editor`, `tiptap`) should be made before implementing `ItemForm`.
- **Pagination:** `getItemsByType` should accept `page` / `cursor` params once item counts grow. Initial implementation can fetch all items (free plan cap is 50 total).
