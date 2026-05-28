import { z } from "zod"

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(150),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  customerType: z.enum(["RESELLER", "RETAIL"]),
  creditLimit: z.coerce.number().min(0),
  termOfPaymentDays: z.coerce.number().int().min(0).max(365)
})

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().cuid()
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
