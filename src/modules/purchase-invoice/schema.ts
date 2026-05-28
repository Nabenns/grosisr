import { z } from "zod"

export const pInvItemSchema = z.object({
  productUnitId: z.string().cuid(),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  poItemId: z.string().cuid().nullable().optional()
})

export const createPInvSchema = z.object({
  poId: z.string().cuid().nullable().optional(),
  supplierId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  supplierInvoiceNo: z.string().max(50).nullable().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxAmount: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  note: z.string().max(500).nullable().optional(),
  items: z.array(pInvItemSchema).min(1)
})

export const voidPInvSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1).max(500)
})

export type CreatePInvInput = z.infer<typeof createPInvSchema>
export type VoidPInvInput = z.infer<typeof voidPInvSchema>
