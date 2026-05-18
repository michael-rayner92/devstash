import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { checkRateLimit, getIP, retryAfterMessage } from "@/lib/rate-limit"

const schema = z.object({
  email: z.email(),
})

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const COOLDOWN_MS = 60 * 1000 // 60 seconds between reset emails

export async function POST(req: Request) {
  const ip = getIP(req)
  const rl = await checkRateLimit("forgot-password", ip)
  if (!rl.success) {
    const message = retryAfterMessage(rl.reset)
    return NextResponse.json({ error: message }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
    })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const { email } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })

    // Always respond the same way to avoid user enumeration
    if (!user || !user.password) {
      return NextResponse.json({ success: true })
    }

    const identifier = `password-reset:${email}`

    const existing = await prisma.verificationToken.findFirst({ where: { identifier } })
    if (existing) {
      const createdAt = new Date(existing.expires.getTime() - TOKEN_EXPIRY_MS)
      if (Date.now() - createdAt.getTime() < COOLDOWN_MS) {
        // Silent 200 — never reveal whether an account exists or is on cooldown
        return NextResponse.json({ success: true })
      }
      await prisma.verificationToken.deleteMany({ where: { identifier } })
    }

    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MS)

    await prisma.verificationToken.create({ data: { identifier, token, expires } })

    await sendPasswordResetEmail(email, token)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
