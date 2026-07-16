import type { ItemDetail } from "@/lib/db/items"

export type UploadResult =
  | { ok: true; data: ItemDetail }
  | { ok: false; error: string }

/**
 * POST a file item as multipart form data via XHR so upload progress can be
 * reported (fetch / Server Actions don't expose upload progress events).
 * Resolves (never rejects) with a discriminated result the caller can branch on.
 */
export function uploadItemFile(
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload")
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true, data: parsed })
        else resolve({ ok: false, error: parsed.error ?? "Upload failed" })
      } catch {
        resolve({ ok: false, error: "Upload failed. Please try again." })
      }
    })
    xhr.addEventListener("error", () =>
      resolve({ ok: false, error: "Upload failed. Please try again." })
    )
    xhr.send(formData)
  })
}
