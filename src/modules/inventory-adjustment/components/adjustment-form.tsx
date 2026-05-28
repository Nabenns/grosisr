"use client"

import { useState, useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { createAdjustmentSchema, type CreateAdjustmentInput } from "../schema"
import { createAdjustmentAction } from "../actions"
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
  defaultWarehouseId: string | null
}

export function AdjustmentForm({ warehouses, products, defaultWarehouseId }: Props) {
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
  } = useForm<CreateAdjustmentInput>({
    resolver: zodResolver(createAdjustmentSchema),
    defaultValues: {
      warehouseId: defaultWarehouseId ?? "",
      reason: "RUSAK",
      note: null,
      items: [{ productId: "", qtyInBaseDiff: 0, note: null }]
    }
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  const productMap = new Map(products.map((p) => [p.id, p]))
  const filteredProducts =
    search.length >= 2
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 20)
      : products.slice(0, 20)

  function onSubmit(values: CreateAdjustmentInput) {
    start(async () => {
      const result = await createAdjustmentAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Adjustment dibuat (${result.data.code}) - status DRAFT`)
      router.push(`/inventory/adjustments/${result.data.id}` as never)
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
            <Label>Gudang *</Label>
            <Select
              value={watch("warehouseId") ?? ""}
              onValueChange={(v) => v && setValue("warehouseId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih gudang" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouseId && (
              <p className="text-sm text-destructive">{errors.warehouseId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Alasan *</Label>
            <Select
              value={watch("reason")}
              onValueChange={(v) => v && setValue("reason", v as never)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RUSAK">Rusak</SelectItem>
                <SelectItem value="HILANG">Hilang</SelectItem>
                <SelectItem value="KOREKSI">Koreksi</SelectItem>
                <SelectItem value="OPNAME">Opname</SelectItem>
                <SelectItem value="LAINNYA">Lainnya</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="col-span-5">Produk *</div>
            <div className="col-span-3">Diff (base unit) *</div>
            <div className="col-span-3">Catatan</div>
            <div className="col-span-1"></div>
          </div>
          {fields.map((f, i) => {
            const productId = watch(`items.${i}.productId`)
            const product = productId ? productMap.get(productId) : null
            return (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
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
                  {product && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Base unit: {product.unitName}
                    </p>
                  )}
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="Bisa negatif untuk pengurangan"
                    {...register(`items.${i}.qtyInBaseDiff`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-3">
                  <Input {...register(`items.${i}.note`)} placeholder="opsional" />
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
            )
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: "", qtyInBaseDiff: 0, note: null })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Item
          </Button>
          {errors.items && typeof errors.items === "object" && "message" in errors.items && (
            <p className="text-sm text-destructive">{(errors.items as { message?: string }).message}</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Adjustment akan dibuat sebagai DRAFT. Klik Simpan, lalu Review + Post di halaman detail untuk
        mengeksekusi perubahan stok.
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
