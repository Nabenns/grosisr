"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createCustomerSchema, type CreateCustomerInput } from "../schema"
import { createCustomerAction, updateCustomerAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  initial?: {
    id: string
    name: string
    phone: string | null
    address: string | null
    customerType: "RESELLER" | "RETAIL"
    creditLimit: number
    termOfPaymentDays: number
  }
}

export function CustomerForm({ initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      name: initial?.name ?? "",
      phone: initial?.phone ?? null,
      address: initial?.address ?? null,
      customerType: initial?.customerType ?? "RETAIL",
      creditLimit: initial?.creditLimit ?? 0,
      termOfPaymentDays: initial?.termOfPaymentDays ?? 0
    }
  })

  function onSubmit(values: CreateCustomerInput) {
    start(async () => {
      const result = initial
        ? await updateCustomerAction({ ...values, id: initial.id })
        : await createCustomerAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Customer diperbarui" : "Customer dibuat")
      router.push("/master/customers" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Customer *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label>Tipe</Label>
          <Select
            value={watch("customerType")}
            onValueChange={(v) => v && setValue("customerType", v as "RESELLER" | "RETAIL")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RETAIL">Retail</SelectItem>
              <SelectItem value="RESELLER">Reseller</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Textarea id="address" {...register("address")} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="creditLimit">Limit Kredit (Rp)</Label>
          <Input id="creditLimit" type="number" min="0" {...register("creditLimit", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="termOfPaymentDays">Termin (hari)</Label>
          <Input
            id="termOfPaymentDays"
            type="number"
            min="0"
            {...register("termOfPaymentDays", { valueAsNumber: true })}
          />
        </div>
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
