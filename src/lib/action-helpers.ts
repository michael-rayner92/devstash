import type { Session } from "next-auth"
import type { ZodError } from "zod"
import { auth } from "@/auth"

/**
 * Shared boilerplate for server actions.
 *
 * Server-only — this module imports `@/auth`, so it must never be imported
 * from a client component. Actions (`"use server"`) and route handlers only.
 */

/** The fallback shown when an action throws something we can't explain. */
export const GENERIC_ACTION_ERROR = "Something went wrong. Please try again."

/**
 * Resolve the caller's session, or `null` when they aren't signed in.
 *
 * Returns the whole `Session` rather than just the user id: `createCheckoutSession`
 * reads `session.user.email` after the guard.
 *
 * Callers must run this **first**, before Zod parsing and before any Pro or
 * rate-limit gate, so an unauthenticated request never consumes a rate-limit
 * token.
 */
export async function requireSession(): Promise<Session | null> {
  const session = await auth()
  return session?.user?.id ? session : null
}

/** The first validation message from a failed `safeParse`, for the user. */
export function firstIssueMessage(error: ZodError, fallback = "Invalid input"): string {
  return error.issues[0]?.message ?? fallback
}

// Trim strings and collapse empties to null; leave non-strings (e.g. null) alone.
// Note: `items.ts` keeps its own `contentOrNull` — code and markdown bodies must
// keep their leading whitespace, so they must not go through this.
export const trimmedOrNull = (v: unknown) =>
  typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v
