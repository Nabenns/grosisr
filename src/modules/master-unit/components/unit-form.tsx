"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createUnitSchema, type CreateUnitInput } from "../schema"
import { createUnitAction, updateUnitAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  initial?: { id: string; name: string }
}

export function UnitForm({ initial }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateUnitInput>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: { name: initial?.name ?? "" }
  })

  function onSubmit(values: CreateUnitInput) {
    start(async () => {
      const result = initial ? await updateUnitAction({ ...values, id: initial.id }) : await createUnitAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "Satuan diperbarui" : "Satuan dibuat")
      router.push("/master/units" as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Satuan *</Label>
        <Input id="name" {...register("name")} placeholder="pcs, pak, dus, ..." />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
