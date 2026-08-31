"use server"

import { z } from "zod"
import {
  GENERIC_ACTION_ERROR,
  firstIssueMessage,
  requireSession,
  trimmedOrNull,
} from "@/lib/action-helpers"
import {
  createCollection as createCollectionQuery,
  updateCollection as updateCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  toggleCollectionFavorite as toggleCollectionFavoriteQuery,
} from "@/lib/db/collections"
import type { CollectionSummary } from "@/lib/db/collections"
import { getPlanUsage } from "@/lib/db/billing"
import { collectionLimitError } from "@/lib/usage-limits"

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
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = createCollectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  try {
    // Free-plan collection limit; `error` already renders as a Sonner toast.
    const usage = await getPlanUsage(session.user.id)
    if (!usage) return { success: false, error: "Account not found" }

    const limitError = collectionLimitError(usage.isPro, usage.collectionCount)
    if (limitError) return { success: false, error: limitError }

    const created = await createCollectionQuery(session.user.id, parsed.data)
    return { success: true, data: created }
  } catch {
    return { success: false, error: GENERIC_ACTION_ERROR }
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
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = updateCollectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  try {
    const updated = await updateCollectionQuery(session.user.id, id, parsed.data)
    if (!updated) {
      return { success: false, error: "Collection not found" }
    }
    return { success: true, data: updated }
  } catch {
    return { success: false, error: GENERIC_ACTION_ERROR }
  }
}

export type DeleteCollectionResult =
  | { success: true }
  | { success: false; error: string }

export async function deleteCollection(id: string): Promise<DeleteCollectionResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const deleted = await deleteCollectionQuery(session.user.id, id)
    if (!deleted) {
      return { success: false, error: "Collection not found" }
    }
    return { success: true }
  } catch {
    return { success: false, error: GENERIC_ACTION_ERROR }
  }
}

export type ToggleFavoriteResult =
  | { success: true; data: { isFavorite: boolean } }
  | { success: false; error: string }

export async function toggleCollectionFavorite(id: string): Promise<ToggleFavoriteResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const result = await toggleCollectionFavoriteQuery(session.user.id, id)
    if (!result) {
      return { success: false, error: "Collection not found" }
    }
    return { success: true, data: result }
  } catch {
    return { success: false, error: GENERIC_ACTION_ERROR }
  }
}
