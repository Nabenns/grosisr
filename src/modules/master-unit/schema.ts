import { z } from "zod"

export const createUnitSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(50)
})

export const updateUnitSchema = createUnitSchema.extend({
  id: z.string().cuid()
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
