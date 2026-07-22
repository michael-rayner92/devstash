import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSearchIndex } from "@/lib/db/search"

/**
 * Returns the signed-in user's full searchable dataset (items + collections)
 * for the client-side command palette. Auth-scoped — the proxy matcher excludes
 * `/api`, so this route guards itself.
 */
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const index = await getSearchIndex(userId)
  return NextResponse.json(index)
}
