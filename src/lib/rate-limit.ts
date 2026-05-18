import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export type RateLimitType =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "resend-verification"

type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`

const CONFIGS: Record<RateLimitType, { requests: number; window: Duration }> = {
  login:                 { requests: 5, window: "15 m" },
  register:              { requests: 3, window: "1 h" },
  "forgot-password":     { requests: 3, window: "1 h" },
  "reset-password":      { requests: 5, window: "15 m" },
  "resend-verification": { requests: 3, window: "15 m" },
}

let _redis: Redis | null | undefined = undefined

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  _redis = url && token ? new Redis({ url, token }) : null
  return _redis
}

const _limiters = new Map<RateLimitType, Ratelimit>()

function getLimiter(type: RateLimitType): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!_limiters.has(type)) {
    const { requests, window } = CONFIGS[type]
    _limiters.set(
      type,
      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, window) })
    )
  }
  return _limiters.get(type)!
}

export function getIP(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  return xff ? xff.split(",")[0].trim() : "127.0.0.1"
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter(type)
    if (!limiter) return { success: true, remaining: 999, reset: 0 }
    return await limiter.limit(identifier)
  } catch {
    return { success: true, remaining: 999, reset: 0 }
  }
}

export function retryAfterMessage(reset: number): string {
  const seconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  const minutes = Math.ceil(seconds / 60)
  return `Too many attempts. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`
}
