"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-destructive">Invalid or missing reset link.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    setLoading(false)

    if (res.ok) {
      router.push("/sign-in?reset=1")
      return
    }

    const data = await res.json()
    if (data.error === "TokenExpired") {
      setError("This reset link has expired. Please request a new one.")
    } else if (data.error === "InvalidToken") {
      setError("Invalid reset link. Please request a new one.")
    } else {
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">New password</label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating…" : "Set new password"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </p>
    </div>
  )
}
