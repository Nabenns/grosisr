"use server"

import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { requireSession } from "@/modules/auth/service"
import { AppError } from "@/lib/errors"

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().nullable().optional()
})

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter")
})

export async function updateMyProfileAction(input: unknown) {
  return action(async () => {
    const session = await requireSession()
    const parsed = profileSchema.parse(input)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.name, email: parsed.email ?? null }
    })
    revalidatePath("/settings/profile")
  })
}

export async function changeMyPasswordAction(input: unknown) {
  return action(async () => {
    const session = await requireSession()
    const parsed = passwordChangeSchema.parse(input)
    const me = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
    const ok = await bcrypt.compare(parsed.currentPassword, me.passwordHash)
    if (!ok) {
      throw new AppError("INVALID_INPUT", "Password lama salah", { currentPassword: "Salah" })
    }
    const newHash = await bcrypt.hash(parsed.newPassword, 12)
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: newHash } })
  })
}
