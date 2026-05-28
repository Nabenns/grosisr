"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { generateWorksheetSchema, postOpnameSchema } from "./schema"
import { generateWorksheet, postOpname } from "./service"

export async function generateWorksheetAction(input: unknown) {
  return action(async () => {
    await requirePermission("inventory.opname.run")
    const parsed = generateWorksheetSchema.parse(input)
    return generateWorksheet(prisma, parsed)
  })
}

export async function postOpnameAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("inventory.opname.run")
    const parsed = postOpnameSchema.parse(input)
    const result = await prisma.$transaction(async (tx) => {
      const posted = await postOpname(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "StockAdjustment",
        entityId: posted.id,
        action: AuditAction.POST,
        after: { ...posted, fromOpname: true } as unknown as Record<string, unknown>
      })
      return posted
    })
    revalidatePath("/inventory/opname")
    revalidatePath("/inventory/adjustments")
    return { id: result.id, code: result.code }
  })
}
