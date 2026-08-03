import { Suspense } from "react"
import { auth } from "@/auth"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { SignInForm } from "@/components/auth/sign-in-form"

export default async function SignInPage() {
  const session = await auth()

  return (
    <AuthPageShell isAuthenticated={Boolean(session?.user)} page="signIn">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to DevStash</h1>
        <p className="text-sm text-muted-foreground">Welcome back</p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthPageShell>
  )
}
