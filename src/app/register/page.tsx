import { auth } from "@/auth"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage() {
  const session = await auth()

  return (
    <AuthPageShell isAuthenticated={Boolean(session?.user)} page="register">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Start stashing your dev knowledge</p>
      </div>
      <RegisterForm />
    </AuthPageShell>
  )
}
