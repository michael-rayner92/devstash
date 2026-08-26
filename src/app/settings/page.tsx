import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/auth"
import { getAccountSettings } from "@/lib/db/profile"
import { getEditorPreferences } from "@/lib/db/editor-preferences"
import { getBillingStatus } from "@/lib/db/billing"
import { PlanBadge } from "@/components/billing/plan-badge"
import { BillingSection } from "@/components/settings/billing-section"
import { CheckoutToast } from "@/components/settings/checkout-toast"
import { ChangePasswordForm } from "@/components/settings/change-password-form"
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog"
import { EditorPreferencesForm } from "@/components/settings/editor-preferences-form"
import { EditorPreferencesProvider } from "@/components/editor-preferences/editor-preferences-provider"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/settings")

  const [{ checkout }, account, editorPreferences, billing] = await Promise.all([
    searchParams,
    getAccountSettings(session.user.id),
    getEditorPreferences(session.user.id),
    getBillingStatus(session.user.id),
  ])
  if (!account || !billing) redirect("/sign-in")

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

        <CheckoutToast status={checkout} />

        {/* Plan & billing. This is the first section on the page, so the #billing
            anchor (sidebar CTA, and the /upgrade redirect for Pro users) should not
            scroll at all — scroll-mt exceeds the section's own offset, which clamps
            the jump to the top and keeps "Settings" and the back link in view. */}
        <section
          id="billing"
          className="scroll-mt-48 rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Plan &amp; billing</h2>
            <PlanBadge isPro={billing.isPro} showIcon={billing.isPro} />
          </div>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {billing.isPro ? "You're on DevStash Pro." : "You're on the Free plan."}
          </p>
          <BillingSection status={billing} />
        </section>

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
