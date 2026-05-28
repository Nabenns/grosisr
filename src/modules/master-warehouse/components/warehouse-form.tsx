"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createWarehouseSchema, type CreateWarehouseInput } from "../schema"
import { createWarehouseAction, updateWarehouseAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface Props {
  initial?: { id: string; code: string; name: string; address: string | null; isDefault: boolean }
}

export function WarehouseForm({ initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateWarehouseInput>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      address: initial?.address ?? null,
      isDefault: initial?.isDefault ?? false
    }
  })

  function onSubmit(values: CreateWarehouseInput) {
    start(async () => {
      const result = initial
        ? await updateWarehouseAction({ ...values, id: initial.id })
        : await createWarehouseAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Gudang diperbarui" : "Gudang dibuat")
      router.push("/master/warehouses" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="code">Kode *</Label>
        <Input id="code" {...register("code")} placeholder="WH-MAIN" />
        {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nama Gudang *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" {...register("address")} rows={3} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={watch("isDefault")} onCheckedChange={(v) => setValue("isDefault", v)} />
        <Label>Jadikan gudang default</Label>
      </div>
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
