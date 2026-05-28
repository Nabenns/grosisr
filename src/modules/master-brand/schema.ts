import { z } from "zod"

export const createBrandSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100)
})

export const updateBrandSchema = createBrandSchema.extend({
  id: z.string().cuid()
})

export type CreateBrandInput = z.infer<typeof createBrandSchema>
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>
