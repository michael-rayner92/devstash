import NextAuth, { CredentialsSignin } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getIP } from "@/lib/rate-limit"

const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED !== "false"

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified"
}

class RateLimited extends CredentialsSignin {
  code = "rate_limited"
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (!token.sub) return token

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { passwordChangedAt: true, isPro: true },
      })

      // A token whose user row no longer exists must not stay valid: without
      // this the session renews indefinitely, and every DB-backed read falls
      // back to empty (`AuthenticatedShell` passes `itemTypes: []`, no user
      // area, no items), producing a signed-in-looking but blank dashboard
      // rather than a redirect to sign-in. Reachable via a purged account, a
      // reset database, or a session minted against a different DB branch.
      // A connection failure throws rather than returning null, so a transient
      // outage doesn't sign anyone out.
      if (!dbUser) return null

      // Password-change invalidation only applies to an existing token being
      // re-validated — on the sign-in pass (`user` present) there is no prior
      // `iat` to compare against.
      if (
        !user &&
        dbUser.passwordChangedAt &&
        token.iat! < dbUser.passwordChangedAt.getTime() / 1000
      ) {
        return null
      }

      // Always synced from the DB (rather than set once at sign-in) so that a
      // Stripe webhook flipping `isPro` is picked up on the next session
      // validation — a page reload after checkout is enough.
      //
      // On the re-validation path this is free: the row is already being read
      // for passwordChangedAt. The sign-in pass does now cost one query it
      // previously skipped (it used to `return token` early), which is the
      // price of having `isPro` correct on the very first request after
      // sign-in rather than one validation later.
      token.isPro = dbUser.isPro

      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      session.user.isPro = token.isPro ?? false
      return session
    },
  },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ip = getIP(request)
        const email = (credentials?.email as string | undefined) ?? ""
        const rl = await checkRateLimit("login", email ? `${ip}:${email}` : ip)
        if (!rl.success) throw new RateLimited()

        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user?.password) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        if (EMAIL_VERIFICATION_ENABLED && !user.emailVerified) {
          throw new EmailNotVerified()
        }

        return user
      },
    }),
  ],
})
