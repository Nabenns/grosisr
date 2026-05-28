import { z } from "zod"

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  parentId: z.string().cuid().nullable().optional()
})

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().cuid()
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
