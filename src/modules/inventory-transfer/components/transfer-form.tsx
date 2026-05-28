"use client"

import { useState, useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { createTransferSchema, type CreateTransferInput } from "../schema"
import { createTransferAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WarehouseOption {
  id: string
  name: string
}
interface ProductOption {
  id: string
  sku: string
  name: string
  unitName: string
}

interface Props {
  warehouses: WarehouseOption[]
  products: ProductOption[]
  defaultFromWarehouseId: string | null
}

export function TransferForm({ warehouses, products, defaultFromWarehouseId }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [search, setSearch] = useState("")

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: {
      fromWarehouseId: defaultFromWarehouseId ?? "",
      toWarehouseId: "",
      note: null,
      items: [{ productId: "", qtyInBase: 0 }]
    }
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  const fromId = watch("fromWarehouseId")
  const filteredProducts =
    search.length >= 2
      ? products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.sku.toLowerCase().includes(search.toLowerCase())
          )
          .slice(0, 20)
      : products.slice(0, 20)

  function onSubmit(values: CreateTransferInput) {
    start(async () => {
      const result = await createTransferAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Transfer dibuat (${result.data.code}) - status DRAFT`)
      router.push(`/inventory/transfers/${result.data.id}` as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dari Gudang *</Label>
            <Select
              value={fromId ?? ""}
              onValueChange={(v) => v && setValue("fromWarehouseId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih asal" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ke Gudang *</Label>
            <Select
              value={watch("toWarehouseId") ?? ""}
              onValueChange={(v) => v && setValue("toWarehouseId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih tujuan" />
              </SelectTrigger>
              <SelectContent>
                {warehouses
                  .filter((w) => w.id !== fromId)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.toWarehouseId && (
              <p className="text-sm text-destructive">{errors.toWarehouseId.message}</p>
            )}
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="note">Catatan</Label>
            <Textarea id="note" {...register("note")} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
            <div className="col-span-7">Produk *</div>
            <div className="col-span-4">Qty (base unit) *</div>
            <div className="col-span-1"></div>
          </div>
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-7">
                <Controller
                  control={control}
                  name={`items.${i}.productId`}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2 sticky top-0 bg-background border-b">
                          <Input
                            placeholder="Cari SKU/nama..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  {...register(`items.${i}.qtyInBase`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: "", qtyInBase: 0 })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Item
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Transfer akan dibuat sebagai DRAFT. Klik Kirim di halaman detail untuk mengeluarkan stok dari
        gudang asal. Stok masuk gudang tujuan saat status berubah ke COMPLETED via Terima.
      </p>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan Draft"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  )
}
