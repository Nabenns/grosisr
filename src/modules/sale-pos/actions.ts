"use server"

import { revalidatePath } from "next/cache"
import { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/db"
import { action } from "@/lib/result"
import { audit } from "@/lib/audit"
import { requirePermission } from "@/modules/auth/service"
import { postSaleSchema, voidSaleSchema } from "./schema"
import { postSale, voidSale } from "./service"
import { searchProductsForPOS } from "./queries"

export async function postSaleAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("sale.post")
    const parsed = postSaleSchema.parse(input)
    const result = await prisma.$transaction(async (tx) => {
      const posted = await postSale(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "SaleInvoice",
        entityId: posted.id,
        action: AuditAction.POST,
        after: posted as unknown as Record<string, unknown>
      })
      return posted
    })
    revalidatePath("/sale/invoices")
    revalidatePath("/sale/pos")
    return {
      id: result.id,
      code: result.code,
      total: Number(result.total),
      paidAmount: Number(result.paidAmount),
      changeAmount: Number(result.changeAmount)
    }
  })
}

export async function voidSaleAction(input: unknown) {
  return action(async () => {
    const session = await requirePermission("sale.void")
    const parsed = voidSaleSchema.parse(input)
    const result = await prisma.$transaction(async (tx) => {
      const voided = await voidSale(tx, parsed, session.user.id)
      await audit({
        tx,
        actorUserId: session.user.id,
        entity: "SaleInvoice",
        entityId: parsed.id,
        action: AuditAction.VOID,
        after: voided as unknown as Record<string, unknown>
      })
      return voided
    })
    revalidatePath("/sale/invoices")
    revalidatePath(`/sale/invoices/${parsed.id}`)
    return result
  })
}

export async function searchPOSProductsAction(q: string, warehouseId: string) {
  return action(async () => {
    await requirePermission("sale.write")
    return searchProductsForPOS(q, warehouseId)
  })
}
