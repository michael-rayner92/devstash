import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getIP, retryAfterMessage } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
})

export async function POST(req: Request) {
  const cloned = req.clone()
  const body = await cloned.json().catch(() => ({}))
  const parsed = schema.safeParse(body)

  // Rate limit keyed by IP:token so users behind shared NAT don't affect each other.
  // Fall back to IP-only when the token is missing/invalid.
  const ip = getIP(req)
  const rlKey = parsed.success ? `${ip}:${parsed.data.token}` : ip
  const rl = await checkRateLimit("reset-password", rlKey)
  if (!rl.success) {
    const message = retryAfterMessage(rl.reset)
    return NextResponse.json({ error: message }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
    })
  }

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const { token, password } = parsed.data

    const record = await prisma.verificationToken.findUnique({ where: { token } })

    if (!record || !record.identifier.startsWith("password-reset:")) {
      return NextResponse.json({ error: "InvalidToken" }, { status: 400 })
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.json({ error: "TokenExpired" }, { status: 400 })
    }

    const email = record.identifier.replace("password-reset:", "")
    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email },
      data: { password: hashed, passwordChangedAt: new Date() },
    })
    await prisma.verificationToken.delete({ where: { token } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
