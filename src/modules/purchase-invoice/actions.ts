"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { createPInvSchema, voidPInvSchema } from "./schema"
import { postPurchaseInvoice, voidPurchaseInvoice } from "./service"
import { listProductUnitsForPicker } from "@/modules/purchase-order/queries"

export async function postPurchaseInvoiceAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("purchase.invoice.post")
    const parsed = createPInvSchema.parse(input)
    const result = await prisma.$transaction(async (tx) => {
      const posted = await postPurchaseInvoice(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "PurchaseInvoice",
        entityId: posted.id,
        action: AuditAction.POST,
        after: posted as unknown as Record<string, unknown>
      })
      return posted
    })
    revalidatePath("/purchase/invoices")
    if (parsed.poId) revalidatePath(`/purchase/orders/${parsed.poId}`)
    return { id: result.id, code: result.code }
  })
}

export async function voidPurchaseInvoiceAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("purchase.invoice.void")
    const parsed = voidPInvSchema.parse(input)
    const result = await prisma.$transaction(async (tx) => {
      const voided = await voidPurchaseInvoice(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "PurchaseInvoice",
        entityId: parsed.id,
        action: AuditAction.VOID,
        after: voided as unknown as Record<string, unknown>
      })
      return voided
    })
    revalidatePath("/purchase/invoices")
    revalidatePath(`/purchase/invoices/${parsed.id}`)
    return result
  })
}

/** Server-side product search for the invoice line picker (the initial page
 * only ships the first 30 units, so typing must query the database). */
export async function searchProductUnitsAction(q: string) {
  return action(async () => {
    await requirePermission("purchase.invoice.write")
    return listProductUnitsForPicker(q, 30)
  })
}
