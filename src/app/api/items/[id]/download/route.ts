import { auth } from "@/auth"
import { getItemFileForDownload } from "@/lib/db/items"
import { getFromR2, objectKeyFromUrl } from "@/lib/r2"
import { contentTypeForFile } from "@/lib/file-constraints"

/**
 * Streams an item's file back through our own origin. This avoids CORS issues
 * with direct R2 access and keeps files behind the app's auth (a user can only
 * fetch their own items). Serves inline by default so images can be used as an
 * `<img>` source; pass `?download=1` to force a save dialog.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id } = await params
  const file = await getItemFileForDownload(userId, id)
  if (!file) {
    return new Response("Not found", { status: 404 })
  }

  let body: Uint8Array
  try {
    ;({ body } = await getFromR2(objectKeyFromUrl(file.fileUrl)))
  } catch (err) {
    console.error("Failed to fetch R2 object for item", id, err)
    return new Response("Failed to fetch file", { status: 502 })
  }

  const fileName = file.fileName ?? "download"
  const contentType = contentTypeForFile(fileName)
  const forceDownload = new URL(req.url).searchParams.get("download") === "1"
  const disposition = forceDownload ? "attachment" : "inline"

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileName)}"`,
      // Prevent MIME sniffing (defense-in-depth for user-supplied SVG/HTML).
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  })
}
