import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import { checkRateLimit, getIP, retryAfterMessage } from "@/lib/rate-limit"

const EMAIL_VERIFICATION_ENABLED = process.env.EMAIL_VERIFICATION_ENABLED !== "false"

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8).max(72),
})

export async function POST(req: Request) {
  const ip = getIP(req)
  const rl = await checkRateLimit("register", ip)
  if (!rl.success) {
    const message = retryAfterMessage(rl.reset)
    return NextResponse.json({ error: message }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
    })
  }

  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      )
    }

    const hashed = await bcrypt.hash(password, 12)

    if (!EMAIL_VERIFICATION_ENABLED) {
      await prisma.user.create({
        data: { name, email, password: hashed, emailVerified: new Date() },
      })
      return NextResponse.json({ success: true, skipVerification: true }, { status: 201 })
    }

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    })

    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expires },
    })

    await sendVerificationEmail(email, name, token)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
