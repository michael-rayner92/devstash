import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"

/**
 * Cloudflare R2 access via the S3-compatible API. Credentials come from env
 * (see `.env.example`). The client is created lazily and memoized so importing
 * this module never throws when the vars are absent (e.g. during build).
 */

const R2_BUCKET = process.env.R2_BUCKET_NAME ?? ""
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "")

let client: S3Client | null = null

function getClient(): S3Client {
  if (client) return client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured (missing R2_* env vars).")
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return client
}

/** Build the public URL for an object key. */
export function publicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Recover the object key from a stored `fileUrl`. Parsing the pathname works
 * regardless of the public base (custom domain or r2.dev), and falls back to
 * the raw value if it isn't a valid URL.
 */
export function objectKeyFromUrl(fileUrl: string): string {
  try {
    return new URL(fileUrl).pathname.replace(/^\/+/, "")
  } catch {
    return fileUrl.replace(/^\/+/, "")
  }
}

/** Upload a buffer to R2 and return its public URL. */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return publicUrl(key)
}

/** Fetch an object's bytes (and its stored content type) from R2. */
export async function getFromR2(
  key: string
): Promise<{ body: Uint8Array; contentType: string | undefined }> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
  )
  if (!res.Body) throw new Error("Empty object body from R2.")
  const body = await res.Body.transformToByteArray()
  return { body, contentType: res.ContentType }
}

/** Delete an object from R2. */
export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })
  )
}
