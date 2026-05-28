"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"

const storeSchema = z.object({
  store_name: z.string().min(1).max(100),
  store_address: z.string().max(500).nullable().optional(),
  store_phone: z.string().max(30).nullable().optional()
})

const generalSchema = z.object({
  allow_negative_stock: z.boolean()
})

export async function updateStoreSettingsAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("setting.write")
    const parsed = storeSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      const before: Record<string, string> = {}
      const after: Record<string, string> = {}
      for (const [key, value] of Object.entries(parsed)) {
        const prev = await tx.setting.findUnique({ where: { key } })
        before[key] = prev?.value ?? ""
        const v = String(value ?? "")
        after[key] = v
        await tx.setting.upsert({
          where: { key },
          create: { key, value: v },
          update: { value: v }
        })
      }
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Setting",
        entityId: "store",
        action: AuditAction.UPDATE,
        before,
        after
      })
    })
    revalidatePath("/settings/store")
  })
}

export async function updateGeneralSettingsAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("setting.write")
    const parsed = generalSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      const v = String(parsed.allow_negative_stock)
      const prev = await tx.setting.findUnique({
        where: { key: "allow_negative_stock" }
      })
      await tx.setting.upsert({
        where: { key: "allow_negative_stock" },
        create: { key: "allow_negative_stock", value: v },
        update: { value: v }
      })
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Setting",
        entityId: "general",
        action: AuditAction.UPDATE,
        before: { allow_negative_stock: prev?.value ?? "false" },
        after: { allow_negative_stock: v }
      })
    })
    revalidatePath("/settings/general")
  })
}
