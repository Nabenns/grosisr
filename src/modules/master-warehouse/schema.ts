import { z } from "zod"

export const createWarehouseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Hanya huruf besar, angka, _, -"),
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  address: z.string().max(500).nullable().optional(),
  isDefault: z.boolean()
})

export const updateWarehouseSchema = createWarehouseSchema.extend({
  id: z.string().cuid()
})

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>
