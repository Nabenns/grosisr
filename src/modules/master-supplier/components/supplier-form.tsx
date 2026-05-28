"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createSupplierSchema, type CreateSupplierInput } from "../schema"
import { createSupplierAction, updateSupplierAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  initial?: {
    id: string
    name: string
    phone: string | null
    address: string | null
    npwp: string | null
    termOfPaymentDays: number
  }
}

export function SupplierForm({ initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      name: initial?.name ?? "",
      phone: initial?.phone ?? null,
      address: initial?.address ?? null,
      npwp: initial?.npwp ?? null,
      termOfPaymentDays: initial?.termOfPaymentDays ?? 0
    }
  })

  function onSubmit(values: CreateSupplierInput) {
    start(async () => {
      const result = initial
        ? await updateSupplierAction({ ...values, id: initial.id })
        : await createSupplierAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Supplier diperbarui" : "Supplier dibuat")
      router.push("/master/suppliers" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Supplier *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="npwp">NPWP</Label>
          <Input id="npwp" {...register("npwp")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" {...register("address")} rows={3} />
      </div>
      <div className="space-y-2 max-w-xs">
        <Label htmlFor="termOfPaymentDays">Termin Pembayaran (hari)</Label>
        <Input
          id="termOfPaymentDays"
          type="number"
          min="0"
          {...register("termOfPaymentDays", { valueAsNumber: true })}
        />
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
