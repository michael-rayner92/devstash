"use server"

import {
  GENERIC_ACTION_ERROR,
  firstIssueMessage,
  requireSession,
} from "@/lib/action-helpers"
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/editor-preferences"
import { editorPreferencesSchema, type EditorPreferences } from "@/lib/editor-preferences"

export type UpdateEditorPreferencesResult =
  | { success: true; data: EditorPreferences }
  | { success: false; error: string }

export async function updateEditorPreferences(
  input: EditorPreferences
): Promise<UpdateEditorPreferencesResult> {
  const session = await requireSession()
  if (!session) {
    return { success: false, error: "Not authenticated" }
  }

  const parsed = editorPreferencesSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) }
  }

  try {
    const saved = await updateEditorPreferencesQuery(session.user.id, parsed.data)
    return { success: true, data: saved }
  } catch {
    return { success: false, error: GENERIC_ACTION_ERROR }
  }
}
