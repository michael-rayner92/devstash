import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      /**
       * Synced from the DB on every session validation (see the `jwt` callback
       * in `src/auth.ts`), so a Stripe webhook flip is visible after a reload.
       *
       * Not available in `src/proxy.ts` — the proxy builds NextAuth from the
       * edge-safe `auth.config.ts`, which has no callbacks. Gate Pro features
       * in server components and server actions only.
       */
      isPro: boolean
    } & DefaultSession["user"]
  }
}

/**
 * The JWT interface is declared in `@auth/core/jwt`; `next-auth/jwt` only
 * `export *`s it. Declaration merging has to target the declaring module, so
 * augmenting `"next-auth/jwt"` (as some v5 docs show) silently does nothing —
 * `token.isPro` stays `unknown` via the interface's index signature.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    isPro?: boolean
  }
}
