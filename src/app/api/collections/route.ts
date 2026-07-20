import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserCollections } from "@/lib/db/collections"

/**
 * Returns the signed-in user's collections (id + name) for the item form's
 * collection selector. Auth-scoped — the proxy matcher excludes `/api`, so this
 * route guards itself.
 */
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const collections = await getUserCollections(userId)
  return NextResponse.json(collections)
}
