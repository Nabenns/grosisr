"use client"

import { useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"
import { createUserSchema, updateUserSchema } from "../schema"
import { createUserAction, updateUserAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RoleOption {
  id: string
  name: string
  description: string | null
}
interface WarehouseOption {
  id: string
  name: string
  code: string
}

interface InitialUser {
  id: string
  username: string
  email: string | null
  name: string
  isActive: boolean
  defaultWarehouseId: string | null
  roleIds: string[]
  warehouseIds: string[]
}

// Combined form schema covers both create and edit; we conditionally validate password.
const formSchema = z.object({
  id: z.string().cuid().optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Hanya huruf, angka, _, -"),
  email: z.string().email().nullable().optional(),
  name: z.string().trim().min(1).max(100),
  password: z.string().optional(),
  isActive: z.boolean(),
  defaultWarehouseId: z.string().cuid().nullable().optional(),
  roleIds: z.array(z.string().cuid()).min(1, "Minimal 1 role"),
  warehouseIds: z.array(z.string().cuid())
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  roles: RoleOption[]
  warehouses: WarehouseOption[]
  initial?: InitialUser
}

export function UserForm({ roles, warehouses, initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const isEdit = !!initial

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initial
      ? {
          id: initial.id,
          username: initial.username,
          email: initial.email,
          name: initial.name,
          password: "",
          isActive: initial.isActive,
          defaultWarehouseId: initial.defaultWarehouseId,
          roleIds: initial.roleIds,
          warehouseIds: initial.warehouseIds
        }
      : {
          username: "",
          email: null,
          name: "",
          password: "",
          isActive: true,
          defaultWarehouseId: null,
          roleIds: [],
          warehouseIds: []
        }
  })

  function onSubmit(values: FormValues) {
    start(async () => {
      let result
      if (isEdit) {
        const parsed = updateUserSchema.safeParse({
          id: initial!.id,
          username: values.username,
          email: values.email,
          name: values.name,
          isActive: values.isActive,
          defaultWarehouseId: values.defaultWarehouseId,
          roleIds: values.roleIds,
          warehouseIds: values.warehouseIds
        })
        if (!parsed.success) {
          toast.error("Input tidak valid")
          return
        }
        result = await updateUserAction(parsed.data)
      } else {
        if (!values.password || values.password.length < 8) {
          toast.error("Password minimal 8 karakter")
          return
        }
        const parsed = createUserSchema.safeParse({
          username: values.username,
          email: values.email,
          name: values.name,
          password: values.password,
          defaultWarehouseId: values.defaultWarehouseId,
          roleIds: values.roleIds,
          warehouseIds: values.warehouseIds
        })
        if (!parsed.success) {
          toast.error("Input tidak valid")
          return
        }
        result = await createUserAction(parsed.data)
      }
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(isEdit ? "User diperbarui" : "User dibuat")
      router.push("/settings/users" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Info User</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input id="username" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label>Default Gudang</Label>
            <Select
              value={watch("defaultWarehouseId") ?? "_none"}
              onValueChange={(v) => setValue("defaultWarehouseId", v === "_none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="(Tidak ada)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">(Tidak ada)</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isEdit && (
            <div className="flex items-center gap-3">
              <Switch checked={watch("isActive")} onCheckedChange={(v) => setValue("isActive", v)} />
              <Label>Aktif</Label>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role *</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="roleIds"
            render={({ field }) => (
              <div className="space-y-2">
                {roles.map((r) => {
                  const checked = field.value?.includes(r.id) ?? false
                  return (
                    <label key={r.id} className="flex items-start gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? [...(field.value ?? []), r.id]
                            : (field.value ?? []).filter((x: string) => x !== r.id)
                          field.onChange(next)
                        }}
                      />
                      <div>
                        <div className="font-medium text-sm">{r.name}</div>
                        {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                      </div>
                    </label>
                  )
                })}
                {errors.roleIds && <p className="text-sm text-destructive">{errors.roleIds.message}</p>}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Akses Gudang</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="warehouseIds"
            render={({ field }) => (
              <div className="space-y-2">
                {warehouses.map((w) => {
                  const checked = field.value?.includes(w.id) ?? false
                  return (
                    <label key={w.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? [...(field.value ?? []), w.id]
                            : (field.value ?? []).filter((x: string) => x !== w.id)
                          field.onChange(next)
                        }}
                      />
                      <span className="text-sm">
                        {w.name} <span className="text-muted-foreground">({w.code})</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  )
}
