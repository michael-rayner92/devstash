import { prisma } from "@/lib/prisma"
import { ITEMS_PER_PAGE, getPageMeta } from "@/lib/pagination"
import type { ContentType, Item, ItemType, Tag } from "@/generated/prisma/client"

/** A page of results plus the totals needed to render pagination controls. */
export type PaginatedItems = {
  items: ItemWithType[]
  totalCount: number
  page: number
  totalPages: number
}

export type ItemWithType = Item & {
  itemType: ItemType
  tags: Tag[]
}

/**
 * Full item detail served over the `/api/items/[id]` route. Dates are
 * serialized to ISO strings so the shape survives JSON transport unchanged.
 */
export type ItemDetail = {
  id: string
  title: string
  description: string | null
  contentType: ContentType
  content: string | null
  url: string | null
  fileName: string | null
  fileSize: number | null
  language: string | null
  isFavorite: boolean
  isPinned: boolean
  updatedAt: string
  itemType: { name: string; icon: string; color: string }
  tags: { id: string; name: string }[]
  collections: { id: string; name: string }[]
}

export async function getPinnedItems(userId: string): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: { itemType: true, tags: { orderBy: { name: "asc" } } },
  })
}

export async function getRecentItems(userId: string, limit = 10): Promise<ItemWithType[]> {
  return prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { itemType: true, tags: { orderBy: { name: "asc" } } },
  })
}

export async function getItemTypeByName(name: string): Promise<ItemType | null> {
  return prisma.itemType.findFirst({ where: { name, isSystem: true } })
}

/**
 * Fetch one page of a user's items of a given type, most-recently-updated
 * first, along with the total count. Only the current page's rows are loaded
 * (Prisma `skip`/`take`); `requestedPage` is clamped into range.
 */
export async function getItemsByType(
  userId: string,
  typeName: string,
  requestedPage = 1,
  perPage: number = ITEMS_PER_PAGE
): Promise<PaginatedItems> {
  const where = { userId, itemType: { name: typeName } }
  const totalCount = await prisma.item.count({ where })
  const { page, totalPages, skip, take } = getPageMeta(totalCount, perPage, requestedPage)

  const items = await prisma.item.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip,
    take,
    include: { itemType: true, tags: { orderBy: { name: "asc" } } },
  })

  return { items, totalCount, page, totalPages }
}

// Shape returned by the detail queries below (base item + the relations we include).
type ItemDetailRow = Item & {
  itemType: ItemType
  tags: Tag[]
  collections: { collection: { id: string; name: string } }[]
}

// Relations to include so a row can be mapped to `ItemDetail`. Tags and
// collections are ordered by name so cards, drawer, and the edit selector match.
const itemDetailInclude = {
  itemType: true,
  tags: { orderBy: { name: "asc" } },
  collections: {
    include: { collection: true },
    orderBy: { collection: { name: "asc" } },
  },
} as const

function toItemDetail(item: ItemDetailRow): ItemDetail {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    content: item.content,
    url: item.url,
    fileName: item.fileName,
    fileSize: item.fileSize,
    language: item.language,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    updatedAt: item.updatedAt.toISOString(),
    itemType: { name: item.itemType.name, icon: item.itemType.icon, color: item.itemType.color },
    tags: item.tags.map((tag) => ({ id: tag.id, name: tag.name })),
    collections: item.collections.map((ic) => ({ id: ic.collection.id, name: ic.collection.name })),
  }
}

/**
 * Fetch a single item's full detail, scoped to its owner. Returns `null` when
 * the item does not exist or does not belong to `userId` (both look identical
 * to the caller so ownership is never leaked).
 */
export async function getItemDetail(userId: string, itemId: string): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    include: itemDetailInclude,
  })

  if (!item) return null

  return toItemDetail(item)
}

/**
 * Filter submitted collection ids down to those actually owned by `userId`.
 * Foreign or non-existent ids are silently dropped, so a client can never link
 * an item into a collection it doesn't own.
 */
async function ownedCollectionIds(userId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const owned = await prisma.collection.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  })
  return owned.map((c) => c.id)
}

export interface UpdateItemData {
  title: string
  description: string | null
  content: string | null
  url: string | null
  language: string | null
  tags: string[]
  collectionIds: string[]
}

/**
 * Update an item's editable fields, scoped to its owner. Ownership is verified
 * first (the `update` where-clause can only target the unique `id`), so a user
 * can never mutate another user's item. Tags are fully replaced: existing links
 * are cleared and the new set is connect-or-created under the same user.
 * Collection membership is fully replaced with the owned subset of
 * `collectionIds` (existing join rows dropped, new ones created).
 * Returns the refreshed `ItemDetail`, or `null` if the item isn't owned/found.
 */
export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateItemData
): Promise<ItemDetail | null> {
  const existing = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { id: true },
  })
  if (!existing) return null

  const collectionIds = await ownedCollectionIds(userId, data.collectionIds)

  const item = await prisma.item.update({
    where: { id: itemId },
    data: {
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      tags: {
        set: [],
        connectOrCreate: data.tags.map((name) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
      collections: {
        deleteMany: {},
        create: collectionIds.map((collectionId) => ({ collectionId })),
      },
    },
    include: itemDetailInclude,
  })

  return toItemDetail(item)
}

export interface CreateItemData {
  typeName: string
  title: string
  description: string | null
  content: string | null
  url: string | null
  language: string | null
  tags: string[]
  collectionIds: string[]
}

// Maps a creatable type name to the Item.contentType it stores its payload under.
const CONTENT_TYPE_BY_TYPE_NAME: Record<string, ContentType> = {
  snippet: "text",
  prompt: "text",
  command: "text",
  note: "text",
  link: "url",
  file: "file",
  image: "file",
}

/**
 * Create a new item owned by `userId`. Looks up the system `ItemType` by name
 * so the caller only ever deals in type names; returns `null` if the name
 * doesn't match a known system type. Tags are connect-or-created under the
 * same user, matching `updateItem`'s tag-handling convention. The item is
 * linked to the owned subset of `collectionIds`.
 */
export async function createItem(userId: string, data: CreateItemData): Promise<ItemDetail | null> {
  const itemType = await prisma.itemType.findFirst({
    where: { name: data.typeName, isSystem: true },
    select: { id: true },
  })
  if (!itemType) return null

  const collectionIds = await ownedCollectionIds(userId, data.collectionIds)

  const item = await prisma.item.create({
    data: {
      title: data.title,
      description: data.description,
      contentType: CONTENT_TYPE_BY_TYPE_NAME[data.typeName],
      content: data.content,
      url: data.url,
      language: data.language,
      userId,
      itemTypeId: itemType.id,
      tags: {
        connectOrCreate: data.tags.map((name) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
      collections: {
        create: collectionIds.map((collectionId) => ({ collectionId })),
      },
    },
    include: itemDetailInclude,
  })

  return toItemDetail(item)
}

export interface CreateFileItemData {
  typeName: "file" | "image"
  title: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  tags: string[]
  collectionIds: string[]
}

/**
 * Create a file-backed item (file/image) owned by `userId`. The payload lives
 * in R2 already; this just records its URL/name/size against a `file`
 * contentType. Returns `null` if the type name isn't a known system type.
 */
export async function createFileItem(
  userId: string,
  data: CreateFileItemData
): Promise<ItemDetail | null> {
  const itemType = await prisma.itemType.findFirst({
    where: { name: data.typeName, isSystem: true },
    select: { id: true },
  })
  if (!itemType) return null

  const collectionIds = await ownedCollectionIds(userId, data.collectionIds)

  const item = await prisma.item.create({
    data: {
      title: data.title,
      description: data.description,
      contentType: "file",
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      userId,
      itemTypeId: itemType.id,
      tags: {
        connectOrCreate: data.tags.map((name) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
      collections: {
        create: collectionIds.map((collectionId) => ({ collectionId })),
      },
    },
    include: itemDetailInclude,
  })

  return toItemDetail(item)
}

/**
 * Fetch the stored file URL + name for an item, scoped to its owner. Used by
 * the download proxy to locate the R2 object. Returns `null` when the item
 * isn't owned/found or has no file.
 */
export async function getItemFileForDownload(
  userId: string,
  itemId: string
): Promise<{ fileUrl: string; fileName: string | null } | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { fileUrl: true, fileName: true },
  })
  if (!item?.fileUrl) return null
  return { fileUrl: item.fileUrl, fileName: item.fileName }
}

/**
 * Delete an item, scoped to its owner. Ownership is verified first (the
 * `delete` where-clause can only target the unique `id`), so a user can never
 * delete another user's item. Cascade rules clear the `ItemCollection` join
 * rows and the implicit Tag<->Item links; the tags themselves are left intact.
 * Returns the deleted item's `fileUrl` (so the caller can clean up R2), or
 * `null` if the item isn't owned/found.
 */
export async function deleteItem(
  userId: string,
  itemId: string
): Promise<{ fileUrl: string | null } | null> {
  const existing = await prisma.item.findFirst({
    where: { id: itemId, userId },
    select: { id: true, fileUrl: true },
  })
  if (!existing) return null

  await prisma.item.delete({ where: { id: itemId } })
  return { fileUrl: existing.fileUrl }
}
