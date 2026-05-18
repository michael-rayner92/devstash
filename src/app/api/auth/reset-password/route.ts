import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input"
      return NextResponse.json({ error: message }, { status: 400 })
    }

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

    await prisma.user.update({ where: { email }, data: { password: hashed } })
    await prisma.verificationToken.delete({ where: { token } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
