"use server"

import { z } from "zod"
import { auth } from "@/auth"
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
} from "@/lib/db/collections"
import type { CollectionSummary } from "@/lib/db/collections"

// Trim strings and collapse empties to null; leave non-strings (e.g. null) alone.
const trimmedOrNull = (v: unknown) =>
  typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v

export interface CreateCollectionInput {
  name: string
  description: string | null
}

export type CreateCollectionResult =
  | { success: true; data: CollectionSummary }
  | { success: false; error: string }

const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.preprocess(trimmedOrNull, z.string().nullable()),
})

export async function createCollection(
  input: CreateCollectionInput
): Promise<CreateCollectionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = createCollectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const created = await createCollectionQuery(session.user.id, parsed.data)
    return { success: true, data: created }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

export interface UpdateCollectionInput {
  name: string
  description: string | null
}

export type UpdateCollectionResult =
  | { success: true; data: CollectionSummary }
  | { success: false; error: string }

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.preprocess(trimmedOrNull, z.string().nullable()),
})

export async function updateCollection(
  id: string,
  input: UpdateCollectionInput
): Promise<UpdateCollectionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = updateCollectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const updated = await updateCollectionQuery(session.user.id, id, parsed.data)
    if (!updated) {
      return { success: false, error: "Collection not found" }
    }
    return { success: true, data: updated }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}

export type DeleteCollectionResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteCollection(id: string): Promise<DeleteCollectionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const deleted = await deleteCollectionQuery(session.user.id, id)
    if (!deleted) {
      return { success: false, error: "Collection not found" }
    }
    return { success: true }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
