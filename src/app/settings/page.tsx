import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/auth"
import { getAccountSettings } from "@/lib/db/profile"
import { getEditorPreferences } from "@/lib/db/editor-preferences"
import { ChangePasswordForm } from "@/components/settings/change-password-form"
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog"
import { EditorPreferencesForm } from "@/components/settings/editor-preferences-form"
import { EditorPreferencesProvider } from "@/components/editor-preferences/editor-preferences-provider"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings")

  const [account, editorPreferences] = await Promise.all([
    getAccountSettings(session.user.id),
    getEditorPreferences(session.user.id),
  ])
  if (!account) redirect("/sign-in")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="text-lg font-semibold">Settings</h1>

        {/* Editor preferences — auto-saves on change */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Editor preferences</h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Customize the code editor used for snippets and commands. Changes save automatically.
          </p>
          <EditorPreferencesProvider initialPreferences={editorPreferences}>
            <EditorPreferencesForm />
          </EditorPreferencesProvider>
        </section>

        {/* Change password — only for email/password accounts */}
        {account.hasPassword && (
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-base font-semibold">Change password</h2>
            <ChangePasswordForm />
          </section>
        )}

        {/* Danger zone */}
        <section className="rounded-xl border border-destructive/40 bg-card p-6">
          <h2 className="mb-1 text-base font-semibold text-destructive">Danger zone</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Permanently delete your account and all associated data.
          </p>
          <DeleteAccountDialog />
        </section>
      </div>
    </div>
  )
}
