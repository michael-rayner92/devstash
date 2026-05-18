import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

const schema = z.object({
  email: z.email(),
})

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const COOLDOWN_MS = 60 * 1000 // 60 seconds between reset emails

export async function POST(req: Request) {
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

    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MS)

    await prisma.verificationToken.create({ data: { identifier, token, expires } })

    await sendPasswordResetEmail(email, token)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
