"use server"

import { auth } from "@/auth"
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/editor-preferences"
import { editorPreferencesSchema, type EditorPreferences } from "@/lib/editor-preferences"

export type UpdateEditorPreferencesResult =
  | { success: true; data: EditorPreferences }
  | { success: false; error: string }

export async function updateEditorPreferences(
  input: EditorPreferences
): Promise<UpdateEditorPreferencesResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = editorPreferencesSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    const saved = await updateEditorPreferencesQuery(session.user.id, parsed.data)
    return { success: true, data: saved }
  } catch {
    return { success: false, error: "Something went wrong. Please try again." }
  }
}
