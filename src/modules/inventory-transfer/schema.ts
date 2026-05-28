import { z } from "zod"

export const transferItemSchema = z.object({
  productId: z.string().cuid(),
  qtyInBase: z.coerce.number().positive("Qty harus > 0")
})

export const createTransferSchema = z
  .object({
    fromWarehouseId: z.string().cuid(),
    toWarehouseId: z.string().cuid(),
    note: z.string().max(500).nullable().optional(),
    items: z.array(transferItemSchema).min(1)
  })
  .refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
    message: "Gudang asal dan tujuan harus berbeda",
    path: ["toWarehouseId"]
  })

export const receiveTransferSchema = z.object({
  id: z.string().cuid(),
  receivedItems: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        qtyReceived: z.coerce.number().min(0)
      })
    )
    .min(1)
})

export type CreateTransferInput = z.infer<typeof createTransferSchema>
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>
