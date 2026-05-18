"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MailOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CheckEmailForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleResend(e: { preventDefault(): void }) {
    e.preventDefault()
    setStatus("loading")
    setErrorMsg("")

    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      setStatus("sent")
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? "Something went wrong.")
      setStatus("error")
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MailOpen className="h-7 w-7 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to your email address. Click the link to
          activate your account.
        </p>
      </div>

      {status === "sent" ? (
        <p className="text-sm text-green-500">Verification email resent — check your inbox.</p>
      ) : (
        <form onSubmit={handleResend} className="space-y-3 text-left">
          <p className="text-center text-xs text-muted-foreground">
            Didn&apos;t receive it? Enter your email to resend.
          </p>
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {status === "error" && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
          <Button type="submit" variant="outline" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "Sending…" : "Resend verification email"}
          </Button>
        </form>
      )}

      <Button variant="ghost" asChild className="w-full">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </div>
  )
}
