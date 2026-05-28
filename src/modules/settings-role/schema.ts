import { z } from "zod"

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Hanya huruf besar, angka, _"),
  description: z.string().max(200).nullable().optional(),
  permissionKeys: z.array(z.string())
})

export const updateRoleSchema = createRoleSchema.extend({
  id: z.string().cuid()
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
