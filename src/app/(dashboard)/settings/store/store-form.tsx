"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateStoreSettingsAction } from "@/modules/settings-store/actions"

interface FormValues {
  store_name: string
  store_address: string
  store_phone: string
}

export function StoreForm({ initial }: { initial: FormValues }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues: initial })

  function onSubmit(values: FormValues) {
    start(async () => {
      const result = await updateStoreSettingsAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Profil toko diperbarui")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="store_name">Nama Toko *</Label>
        <Input id="store_name" {...register("store_name", { required: "Wajib diisi" })} />
        {errors.store_name && (
          <p className="text-sm text-destructive">{errors.store_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="store_address">Alamat</Label>
        <Textarea id="store_address" {...register("store_address")} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="store_phone">Telepon</Label>
        <Input id="store_phone" {...register("store_phone")} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  )
}
