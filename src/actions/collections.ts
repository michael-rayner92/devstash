"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { createCollection as createCollectionQuery } from "@/lib/db/collections"
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
