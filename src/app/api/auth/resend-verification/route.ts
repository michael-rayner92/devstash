import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import { checkRateLimit, getIP, retryAfterMessage } from "@/lib/rate-limit"

const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED !== "false"

const schema = z.object({ email: z.email() })

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000
const COOLDOWN_MS = 60 * 1000

// Generic success returned even when no email is sent to avoid leaking account existence.
const OK = NextResponse.json({ success: true })

export async function POST(req: Request) {
  if (!EMAIL_VERIFICATION_ENABLED) return OK

  // Parse email first so we can use it as part of the rate limit key
  const cloned = req.clone()
  const body = await cloned.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 })
  }
  const { email } = parsed.data

  const ip = getIP(req)
  const rl = await checkRateLimit("resend-verification", `${ip}:${email}`)
  if (!rl.success) {
    const message = retryAfterMessage(rl.reset)
    return NextResponse.json({ error: message }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { emailVerificationTokens: { orderBy: { expires: "desc" }, take: 1 } },
    })

    // Don't reveal whether the email exists or is already verified.
    if (!user || user.emailVerified) return OK

    const existing = user.emailVerificationTokens[0]
    if (existing) {
      const createdAt = new Date(existing.expires.getTime() - TOKEN_EXPIRY_MS)
      if (Date.now() - createdAt.getTime() < COOLDOWN_MS) {
        return NextResponse.json(
          { error: "Please wait a moment before requesting another email." },
          { status: 429 }
        )
      }
      // Delete stale tokens before issuing a new one.
      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
    }

    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MS)

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expires },
    })

    await sendVerificationEmail(email, user.name ?? email, token)

    return OK
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
