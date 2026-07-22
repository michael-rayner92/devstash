import { prisma } from "@/lib/prisma"

/** A single searchable item — enough to match on and render a palette row. */
export type SearchItem = {
  id: string
  title: string
  /** Short content/url/description preview, used for fuzzy matching. */
  preview: string
  type: { name: string; icon: string; color: string }
}

/** A searchable collection — matched by name, displays its item count. */
export type SearchCollection = {
  id: string
  name: string
  itemCount: number
}

/** The full client-side search dataset for the command palette. */
export type SearchIndex = {
  items: SearchItem[]
  collections: SearchCollection[]
}

const PREVIEW_LENGTH = 120

// Mirrors ItemCard's preview precedence (description → content → url) so what
// the palette matches against lines up with what the cards show.
function buildPreview(item: {
  description: string | null
  content: string | null
  url: string | null
}): string {
  return (item.description ?? item.content ?? item.url ?? "").slice(0, PREVIEW_LENGTH)
}

/**
 * The signed-in user's full searchable dataset (all items + all collections),
 * scoped to `userId`. Deliberately a purpose-built lightweight query rather than
 * reusing `getRecentItems`/`getCollections`: it `select`s only the fields the
 * palette needs and counts collection items via `_count` — avoiding loading
 * full item bodies or every collection's items just to size them.
 */
export async function getSearchIndex(userId: string): Promise<SearchIndex> {
  const [items, collections] = await Promise.all([
    prisma.item.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        url: true,
        itemType: { select: { name: true, icon: true, color: true } },
      },
    }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        _count: { select: { items: true } },
      },
    }),
  ])

  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      preview: buildPreview(item),
      type: item.itemType,
    })),
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      itemCount: collection._count.items,
    })),
  }
}
