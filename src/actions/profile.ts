"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(72, "Password must be 72 characters or fewer"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
})

export async function changePassword(
  _prev: { error?: string; success?: boolean },
  formData: FormData
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  if (!user?.password) {
    return { error: "No password set on this account" }
  }

  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    return { error: "Current password is incorrect" }
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed, passwordChangedAt: new Date() },
  })

  return { success: true }
}

export async function deleteAccount(): Promise<{ error: string } | void> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  await prisma.user.delete({ where: { id: session.user.id } })

  redirect("/sign-in?deleted=1")
}
