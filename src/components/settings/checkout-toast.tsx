"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

/**
 * Surfaces the `?checkout=success` / `?checkout=cancelled` params Stripe
 * Checkout redirects back with, mirroring how `/sign-in` handles `?verified=1`.
 *
 * The param is stripped afterwards so a refresh doesn't re-toast — and the
 * resulting navigation re-runs the server page, which can pick up the webhook's
 * write if it landed just after the redirect.
 *
 * The toast is fired from a timeout rather than directly in the effect. Sonner's
 * `<Toaster/>` sits *after* `{children}` in the root layout, so its subscribe
 * effect runs after this component's — a toast raised synchronously on mount has
 * no subscriber yet and is silently dropped (verified in-browser: nothing ever
 * rendered). Deferring by a tick puts it after every mount effect.
 *
 * Stripping the param is also what keeps this idempotent, so no `useRef` guard
 * is needed: the re-render arrives with `status` undefined. A ref guard would
 * actively break it, since StrictMode's discarded first pass would consume the
 * only toast.
 */
export function CheckoutToast({ status }: { status: string | undefined }) {
  const router = useRouter()

  useEffect(() => {
    if (status !== "success" && status !== "cancelled") return

    const timer = setTimeout(() => {
      if (status === "success") {
        toast.success("Welcome to Pro! Your subscription is now active.")
      } else {
        toast("Checkout cancelled — you haven't been charged.")
      }
      router.replace("/settings")
    }, 0)

    return () => clearTimeout(timer)
  }, [status, router])

  return null
}
