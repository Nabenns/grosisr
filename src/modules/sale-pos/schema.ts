import { z } from "zod"

export const saleItemSchema = z.object({
  productUnitId: z.string().cuid(),
  qty: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0)
})

export const postSaleSchema = z.object({
  customerId: z.string().cuid().nullable().optional(),
  warehouseId: z.string().cuid(),
  saleType: z.enum(["CASH", "CREDIT"]),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
  discountAmount: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["TUNAI", "TRANSFER", "QRIS", "KARTU"]).nullable().optional(),
  paymentRefNo: z.string().max(50).nullable().optional(),
  paidAmount: z.coerce.number().min(0),
  note: z.string().max(500).nullable().optional(),
  idempotencyKey: z.string().min(1).max(100),
  items: z.array(saleItemSchema).min(1)
})

export const voidSaleSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1).max(500)
})

export type PostSaleInput = z.infer<typeof postSaleSchema>
export type VoidSaleInput = z.infer<typeof voidSaleSchema>
