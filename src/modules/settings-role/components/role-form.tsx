"use client"

import { useState, useTransition, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createRoleSchema, type CreateRoleInput } from "../schema"
import { createRoleAction, updateRoleAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PermissionOption {
  id: string
  key: string
  description: string
  module: string
}

interface InitialRole {
  id: string
  name: string
  description: string | null
  permissionKeys: string[]
  isSystem: boolean
}

interface Props {
  permissions: PermissionOption[]
  initial?: InitialRole
}

export function RoleForm({ permissions, initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [search, setSearch] = useState("")
  const isOwner = initial?.name === "OWNER"

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? null,
      permissionKeys: initial?.permissionKeys ?? []
    }
  })

  const filteredGroups = useMemo(() => {
    const groups: Record<string, PermissionOption[]> = {}
    const q = search.toLowerCase()
    for (const p of permissions) {
      if (q && !p.key.toLowerCase().includes(q)) continue
      if (!groups[p.module]) groups[p.module] = []
      groups[p.module]!.push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [permissions, search])

  function onSubmit(values: CreateRoleInput) {
    start(async () => {
      const result = initial ? await updateRoleAction({ ...values, id: initial.id }) : await createRoleAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Role diperbarui" : "Role dibuat")
      router.push("/settings/roles" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Info Role</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Role *</Label>
            <Input id="name" {...register("name")} disabled={isOwner} placeholder="ADMIN, KASIR..." />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" {...register("description")} rows={2} disabled={isOwner} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Cari permission..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Controller
            control={control}
            name="permissionKeys"
            render={({ field }) => {
              function toggle(key: string, on: boolean) {
                const set = new Set(field.value ?? [])
                if (on) set.add(key)
                else set.delete(key)
                field.onChange([...set])
              }
              function toggleModule(group: PermissionOption[], on: boolean) {
                const set = new Set(field.value ?? [])
                for (const p of group) {
                  if (on) set.add(p.key)
                  else set.delete(p.key)
                }
                field.onChange([...set])
              }
              return (
                <div className="space-y-3">
                  {filteredGroups.map(([module, group]) => {
                    const allChecked = group.every((p) => field.value?.includes(p.key))
                    return (
                      <div key={module} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                            {module}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isOwner}
                            onClick={() => toggleModule(group, !allChecked)}
                          >
                            {allChecked ? "Uncheck all" : "Check all"}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {group.map((p) => {
                            const checked = field.value?.includes(p.key) ?? false
                            return (
                              <label key={p.key} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={checked}
                                  disabled={isOwner}
                                  onCheckedChange={(v) => toggle(p.key, !!v)}
                                />
                                <span className="font-mono text-xs">{p.key}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || isOwner}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
      {isOwner && (
        <p className="text-sm text-muted-foreground">
          Role OWNER tidak bisa diedit. OWNER selalu memiliki semua permission.
        </p>
      )}
    </form>
  )
}
