import { z } from "zod"

export const generateWorksheetSchema = z.object({
  warehouseId: z.string().cuid(),
  categoryId: z.string().cuid().nullable().optional()
})

export const postOpnameSchema = z.object({
  warehouseId: z.string().cuid(),
  note: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        qtyPhysical: z.coerce.number().min(0),
        note: z.string().max(200).nullable().optional()
      })
    )
    .min(1)
})

export type GenerateWorksheetInput = z.infer<typeof generateWorksheetSchema>
export type PostOpnameInput = z.infer<typeof postOpnameSchema>
