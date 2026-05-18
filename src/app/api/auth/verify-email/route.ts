import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in?error=InvalidToken", base))
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  })

  if (!record) {
    return NextResponse.redirect(new URL("/sign-in?error=InvalidToken", base))
  }

  if (record.expires < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { token } })
    return NextResponse.redirect(new URL("/sign-in?error=TokenExpired", base))
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  })

  await prisma.emailVerificationToken.delete({ where: { token } })

  return NextResponse.redirect(new URL("/sign-in?verified=1", base))
}
