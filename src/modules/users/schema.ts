import { z } from "zod"

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Minimal 3 karakter")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Hanya huruf, angka, _, -"),
  email: z.string().email().nullable().optional(),
  name: z.string().trim().min(1, "Nama wajib diisi").max(100),
  password: z.string().min(8, "Minimal 8 karakter"),
  defaultWarehouseId: z.string().cuid().nullable().optional(),
  roleIds: z.array(z.string().cuid()).min(1, "Minimal 1 role"),
  warehouseIds: z.array(z.string().cuid())
})

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({
    id: z.string().cuid(),
    isActive: z.boolean()
  })

export const resetPasswordSchema = z.object({
  id: z.string().cuid(),
  newPassword: z.string().min(8)
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
