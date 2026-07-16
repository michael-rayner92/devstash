import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Copies text to the clipboard and exposes a transient `copied` flag that
 * resets after `resetMs`. Fails silently when the Clipboard API is unavailable
 * (e.g. an insecure context). The reset timer is cleared on unmount.
 */
export function useCopyToClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current)
    }
  }, [])

  const copy = useCallback(
    async (text: string) => {
      if (!text) return
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (timeout.current) clearTimeout(timeout.current)
        timeout.current = setTimeout(() => setCopied(false), resetMs)
      } catch {
        // Clipboard can be unavailable (e.g. insecure context) — fail silently.
      }
    },
    [resetMs]
  )

  return { copied, copy }
}
