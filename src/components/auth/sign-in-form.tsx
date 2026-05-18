"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
    </svg>
  )
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get("callbackUrl") ?? ""
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard"

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success("Account created! Sign in to continue.")
    }
    if (searchParams.get("verified") === "1") {
      toast.success("Email verified! You can now sign in.")
    }
    if (searchParams.get("reset") === "1") {
      toast.success("Password updated! Sign in with your new password.")
    }
    const error = searchParams.get("error")
    if (error === "InvalidToken") {
      toast.error("Verification link is invalid.")
    } else if (error === "TokenExpired") {
      toast.error("Verification link has expired. Please register again.")
    }
  }, [searchParams])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCredentials(e: { preventDefault(): void }) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      if (result.code === "email_not_verified") {
        setError("Please verify your email before signing in. Check your inbox.")
      } else {
        setError("Invalid email or password.")
      }
    } else {
      router.push(callbackUrl)
    }
  }

  async function handleGitHub() {
    await signIn("github", { callbackUrl })
  }

  return (
    <div className="space-y-6">
      <Button type="button" variant="outline" className="w-full" onClick={handleGitHub}>
        <GitHubIcon className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleCredentials} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </div>
  )
}
