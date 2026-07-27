import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import {
  normalizeEditorPreferences,
  type EditorPreferences,
} from "@/lib/editor-preferences"

/**
 * Read a user's editor preferences, normalized against defaults. Returns the
 * defaults when the user has none stored (or stored partial/invalid JSON).
 */
export async function getEditorPreferences(userId: string): Promise<EditorPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  })
  return normalizeEditorPreferences(user?.editorPreferences)
}

/**
 * Persist a user's editor preferences and return the stored (normalized) value.
 * Callers pass an already-validated `EditorPreferences` (Zod-parsed in the action).
 */
export async function updateEditorPreferences(
  userId: string,
  preferences: EditorPreferences
): Promise<EditorPreferences> {
  await prisma.user.update({
    where: { id: userId },
    // EditorPreferences is a fixed-shape interface; Prisma's JSON input wants an
    // index signature, so widen it to the JSON input type.
    data: { editorPreferences: preferences as unknown as Prisma.InputJsonValue },
  })
  return preferences
}
