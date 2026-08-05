import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { auth } from "@/auth"
import { createFileItem } from "@/lib/db/items"
import { getPlanUsage } from "@/lib/db/billing"
import { itemLimitError, uploadNotAllowedError } from "@/lib/usage-limits"
import { uploadToR2 } from "@/lib/r2"
import {
  contentTypeForFile,
  extensionOf,
  validateUpload,
  type UploadKind,
} from "@/lib/file-constraints"

const UPLOAD_KINDS: UploadKind[] = ["file", "image"]

/**
 * Handles a multipart upload for file/image items: validates the file against
 * its type's constraints, stores it in R2 under an owner-scoped key, and
 * records the item in the DB. Returns the created `ItemDetail` so the client
 * behaves the same as the text/url create flow.
 */
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = form.get("file")
  const typeName = String(form.get("typeName") ?? "")
  const title = String(form.get("title") ?? "").trim()
  const description = String(form.get("description") ?? "").trim() || null
  const tags = Array.from(
    new Set(
      String(form.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
  const collectionIds = Array.from(
    new Set(
      String(form.get("collectionIds") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )

  if (!UPLOAD_KINDS.includes(typeName as UploadKind)) {
    return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 })
  }

  // Plan gates. File/image items are created here via `createFileItem`, not
  // through the `createItem` action (whose CREATABLE_TYPE_NAMES excludes
  // them) — so this route needs its own Pro check *and* its own item-limit
  // check. Both run before `uploadToR2` so a rejected upload never leaves an
  // orphaned object in the bucket. They run after `req.formData()` so the
  // request body is fully consumed before we respond.
  const usage = await getPlanUsage(userId)
  if (!usage) {
    return NextResponse.json({ error: "Account not found" }, { status: 401 })
  }

  const proError = uploadNotAllowedError(usage.isPro)
  if (proError) {
    return NextResponse.json({ error: proError }, { status: 403 })
  }

  // Defence in depth, and currently unreachable: uploads are Pro-only, and
  // `getPlanLimits` makes Pro unlimited, so anything that clears the check
  // above already has `items === null`. It earns its place only if the plan
  // ever lets Free users upload — keep it, but don't read it as live cover
  // for the 50-item cap. The gate that actually bites is in `createItem`.
  const limitError = itemLimitError(usage.isPro, usage.itemCount)
  if (limitError) {
    return NextResponse.json({ error: limitError }, { status: 403 })
  }

  const kind = typeName as UploadKind
  const validation = validateUpload(kind, file.name, file.size)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const key = `${userId}/${randomUUID()}${extensionOf(file.name)}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileUrl = await uploadToR2(key, buffer, contentTypeForFile(file.name))

    const created = await createFileItem(userId, {
      typeName: kind,
      title,
      description,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      tags,
      collectionIds,
    })

    if (!created) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 })
    }

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error("Upload failed", err)
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    )
  }
}
