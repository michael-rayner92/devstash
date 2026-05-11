import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"

export default {
  providers: [
    GitHub,
    Credentials({
      // Real authorize logic lives in auth.ts (needs bcrypt, not edge-safe)
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig
