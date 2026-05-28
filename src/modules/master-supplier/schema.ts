import { z } from "zod"

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(150),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  npwp: z.string().max(30).nullable().optional(),
  termOfPaymentDays: z.coerce.number().int().min(0).max(365)
})

export const updateSupplierSchema = createSupplierSchema.extend({
  id: z.string().cuid()
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
