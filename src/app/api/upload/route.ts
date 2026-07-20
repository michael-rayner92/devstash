import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { auth } from "@/auth"
import { createFileItem } from "@/lib/db/items"
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
