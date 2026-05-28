import { z } from "zod"

export const adjustmentItemSchema = z.object({
  productId: z.string().cuid(),
  qtyInBaseDiff: z.coerce.number().refine((v) => v !== 0, "Diff harus != 0"),
  note: z.string().max(200).nullable().optional()
})

export const createAdjustmentSchema = z.object({
  warehouseId: z.string().cuid(),
  reason: z.enum(["RUSAK", "HILANG", "OPNAME", "KOREKSI", "LAINNYA"]),
  note: z.string().max(500).nullable().optional(),
  items: z.array(adjustmentItemSchema).min(1, "Minimal 1 item")
})

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>
