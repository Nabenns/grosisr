"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { getTelegramConfig, sendTelegramMessage } from "@/lib/notify/telegram"

const storeSchema = z.object({
  store_name: z.string().min(1).max(100),
  store_address: z.string().max(500).nullable().optional(),
  store_phone: z.string().max(30).nullable().optional()
})

const generalSchema = z.object({
  allow_negative_stock: z.boolean()
})

const notificationSchema = z.object({
  telegram_bot_token: z.string().max(200).optional(),
  telegram_chat_id: z.string().max(100).optional(),
  low_stock_alert_enabled: z.boolean()
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

export async function updateNotificationSettingsAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("setting.write")
    const parsed = notificationSchema.parse(input)
    await prisma.$transaction(async (tx) => {
      const entries: Array<[string, string]> = [
        ["telegram_chat_id", (parsed.telegram_chat_id ?? "").trim()],
        ["low_stock_alert_enabled", String(parsed.low_stock_alert_enabled)]
      ]
      // Blank token means "keep the stored one" so the secret never round-trips
      // through the browser.
      const token = (parsed.telegram_bot_token ?? "").trim()
      if (token) entries.push(["telegram_bot_token", token])

      const before: Record<string, string> = {}
      const after: Record<string, string> = {}
      for (const [key, value] of entries) {
        const prev = await tx.setting.findUnique({ where: { key } })
        before[key] = key === "telegram_bot_token" ? (prev?.value ? "***" : "") : (prev?.value ?? "")
        after[key] = key === "telegram_bot_token" ? (value ? "***" : "") : value
        await tx.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value }
        })
      }
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "Setting",
        entityId: "notifications",
        action: AuditAction.UPDATE,
        before,
        after
      })
    })
    revalidatePath("/settings/notifications")
  })
}

export async function sendTelegramTestAction() {
  return action(async () => {
    await requirePermission("setting.write")
    const cfg = await getTelegramConfig()
    if (!cfg) {
      return { sent: false, error: "Isi bot token dan chat id lalu simpan dulu." }
    }
    const result = await sendTelegramMessage(
      "✅ <b>Tes notifikasi Grosir</b>\nKalau pesan ini masuk, alert stok menipis siap dipakai."
    )
    if (!result.ok) return { sent: false, error: result.error ?? "Gagal mengirim" }
    return { sent: true }
  })
}
