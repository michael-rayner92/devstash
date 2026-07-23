import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/auth"
import { getProfileData } from "@/lib/db/profile"
import { iconMap } from "@/lib/icon-map"
import { getInitials } from "@/lib/string-utils"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/profile")

  const profile = await getProfileData(session.user.id)
  if (!profile) redirect("/sign-in")

  const joinDate = profile.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

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

        {/* User info */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="mb-4 text-lg font-semibold">Profile</h1>
          <div className="flex items-center gap-4">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name ?? "Avatar"}
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold uppercase">
                {getInitials(profile.name ?? profile.email)}
              </div>
            )}
            <div className="min-w-0">
              {profile.name && (
                <p className="truncate text-base font-medium">{profile.name}</p>
              )}
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Joined {joinDate}</p>
            </div>
          </div>
        </section>

        {/* Usage stats */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold">Usage</h2>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Total items</p>
              <p className="mt-0.5 text-2xl font-bold">{profile.totalItems}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Collections</p>
              <p className="mt-0.5 text-2xl font-bold">{profile.totalCollections}</p>
            </div>
          </div>

          {profile.itemTypeCounts.length > 0 && (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                By type
              </p>
              <ul className="space-y-2">
                {profile.itemTypeCounts.map((type) => {
                  const Icon = iconMap[type.icon]
                  return (
                    <li key={type.id} className="flex items-center gap-2.5">
                      {Icon && (
                        <Icon
                          className="h-4 w-4 shrink-0"
                          style={{ color: type.color }}
                        />
                      )}
                      <span className="flex-1 capitalize text-sm">{type.name}s</span>
                      <span className="text-sm font-medium">{type.count}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
