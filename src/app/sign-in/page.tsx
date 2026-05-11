import { Suspense } from "react"
import { SignInForm } from "@/components/auth/sign-in-form"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to DevStash</h1>
          <p className="text-sm text-muted-foreground">Welcome back</p>
        </div>
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
    </div>
  )
}
