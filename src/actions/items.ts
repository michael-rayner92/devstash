"use server"

import { z } from "zod"
import { auth } from "@/auth"
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  updateItem as updateItemQuery,
} from "@/lib/db/items"
import type { ItemDetail } from "@/lib/db/items"

export interface UpdateItemInput {
  title: string
  description: string | null
  content: string | null
  url: string | null
  language: string | null
  tags: string[]
}

export type UpdateItemResult =
  | { success: true; data: ItemDetail }
  | { success: false; error: string }

// Trim strings and collapse empties to null; leave non-strings (e.g. null) alone.
const trimmedOrNull = (v: unknown) =>
  typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v

// Like `trimmedOrNull` but preserves internal/leading whitespace (code, prose).
const contentOrNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v

const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.preprocess(trimmedOrNull, z.string().nullable()),
  content: z.preprocess(contentOrNull, z.string().nullable()),
  language: z.preprocess(trimmedOrNull, z.string().nullable()),
  url: z.preprocess(trimmedOrNull, z.url("Enter a valid URL").nullable()),
  tags: z.preprocess(
    (v) =>
      Array.isArray(v)
        ? Array.from(new Set(v.map((t) => String(t).trim()).filter(Boolean)))
        : v,
    z.array(z.string())
  ),
})

export async function updateItem(
  itemId: string,
  input: UpdateItemInput
): Promise<UpdateItemResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = updateItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const updated = await updateItemQuery(session.user.id, itemId, parsed.data)
    if (!updated) {
      return { success: false, error: "Item not found" }
    }
    return { success: true, data: updated }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

// Types the create dialog offers — file/image are Pro-only and out of scope here.
const CREATABLE_TYPE_NAMES = ["snippet", "prompt", "command", "note", "link"] as const

export interface CreateItemInput {
  typeName: string
  title: string
  description: string | null
  content: string | null
  url: string | null
  language: string | null
  tags: string[]
}

export type CreateItemResult =
  | { success: true; data: ItemDetail }
  | { success: false; error: string }

const createItemSchema = z
  .object({
    typeName: z.enum(CREATABLE_TYPE_NAMES),
    title: z.string().trim().min(1, "Title is required"),
    description: z.preprocess(trimmedOrNull, z.string().nullable()),
    content: z.preprocess(contentOrNull, z.string().nullable()),
    language: z.preprocess(trimmedOrNull, z.string().nullable()),
    url: z.preprocess(trimmedOrNull, z.url("Enter a valid URL").nullable()),
    tags: z.preprocess(
      (v) =>
        Array.isArray(v)
          ? Array.from(new Set(v.map((t) => String(t).trim()).filter(Boolean)))
          : v,
      z.array(z.string())
    ),
  })
  .refine((data) => data.typeName !== "link" || data.url !== null, {
    message: "URL is required",
    path: ["url"],
  })

export async function createItem(input: CreateItemInput): Promise<CreateItemResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = createItemSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const created = await createItemQuery(session.user.id, parsed.data)
    if (!created) {
      return { success: false, error: "Invalid item type" }
    }
    return { success: true, data: created }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

export type DeleteItemResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteItem(itemId: string): Promise<DeleteItemResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const deleted = await deleteItemQuery(session.user.id, itemId)
    if (!deleted) {
      return { success: false, error: "Item not found" }
    }
    return { success: true }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
