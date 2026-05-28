"use client"

import { useState, useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import Decimal from "decimal.js"
import { createPOSchema, type CreatePOInput } from "../schema"
import { createPOAction, updatePOAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatIDR } from "@/lib/money"

interface SupplierOption {
  id: string
  name: string
}
interface WarehouseOption {
  id: string
  name: string
}
interface ProductUnitOption {
  id: string
  productSku: string
  productName: string
  unitName: string
  purchasePrice: number
  isDefaultPurchase: boolean
}

interface InitialPO {
  id: string
  supplierId: string
  warehouseId: string
  orderDate: Date
  expectedDate: Date | null
  note: string | null
  items: {
    productUnitId: string
    qty: number
    price: number
    discount: number
  }[]
}

interface Props {
  suppliers: SupplierOption[]
  warehouses: WarehouseOption[]
  productUnits: ProductUnitOption[]
  defaultWarehouseId: string | null
  initial?: InitialPO
}

function fmtDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function POForm({ suppliers, warehouses, productUnits, defaultWarehouseId, initial }: Props) {
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
  } = useForm<CreatePOInput>({
    resolver: zodResolver(createPOSchema),
    defaultValues: initial
      ? {
          supplierId: initial.supplierId,
          warehouseId: initial.warehouseId,
          orderDate: initial.orderDate,
          expectedDate: initial.expectedDate,
          note: initial.note,
          items: initial.items
        }
      : {
          supplierId: "",
          warehouseId: defaultWarehouseId ?? "",
          orderDate: new Date(),
          expectedDate: null,
          note: null,
          items: [{ productUnitId: "", qty: 1, price: 0, discount: 0 }]
        }
  })
  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  const productUnitMap = new Map(productUnits.map((pu) => [pu.id, pu]))
  const filtered =
    search.length >= 2
      ? productUnits
          .filter(
            (pu) =>
              pu.productName.toLowerCase().includes(search.toLowerCase()) ||
              pu.productSku.toLowerCase().includes(search.toLowerCase())
          )
          .slice(0, 30)
      : productUnits.slice(0, 30)

  const items = watch("items") ?? []
  const totalCalc = items.reduce(
    (acc, i) =>
      acc.plus(
        new Decimal(i.qty || 0)
          .times(i.price || 0)
          .minus(new Decimal(i.qty || 0).times(i.discount || 0))
      ),
    new Decimal(0)
  )

  function pickProductUnit(index: number, puId: string) {
    setValue(`items.${index}.productUnitId`, puId)
    const pu = productUnitMap.get(puId)
    if (pu) {
      const currentPrice = watch(`items.${index}.price`)
      // Auto-fill purchase price only if empty (so editing PO doesn't overwrite)
      if (!currentPrice || currentPrice === 0) {
        setValue(`items.${index}.price`, pu.purchasePrice)
      }
    }
  }

  function onSubmit(values: CreatePOInput) {
    start(async () => {
      const result = initial
        ? await updatePOAction({ ...values, id: initial.id })
        : await createPOAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(initial ? "PO diperbarui" : "PO dibuat (status DRAFT)")
      const id = "id" in result.data ? result.data.id : initial?.id
      router.push(`/purchase/orders/${id}` as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={watch("supplierId") ?? ""}
              onValueChange={(v) => v && setValue("supplierId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Gudang Tujuan *</Label>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderDate">Tgl Pesan *</Label>
            <Input
              id="orderDate"
              type="date"
              defaultValue={fmtDateInput(initial?.orderDate ?? new Date())}
              onChange={(e) => setValue("orderDate", new Date(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedDate">Tgl Diharapkan</Label>
            <Input
              id="expectedDate"
              type="date"
              defaultValue={initial?.expectedDate ? fmtDateInput(initial.expectedDate) : ""}
              onChange={(e) =>
                setValue("expectedDate", e.target.value ? new Date(e.target.value) : null)
              }
            />
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
            <div className="col-span-5">Produk + Satuan *</div>
            <div className="col-span-1">Qty *</div>
            <div className="col-span-2">Harga Beli *</div>
            <div className="col-span-2">Diskon /unit</div>
            <div className="col-span-1">Subtotal</div>
            <div className="col-span-1"></div>
          </div>
          {fields.map((f, i) => {
            const items = watch(`items.${i}`)
            const qty = Number(items?.qty ?? 0)
            const price = Number(items?.price ?? 0)
            const discount = Number(items?.discount ?? 0)
            const subtotal = qty * (price - discount)
            return (
              <div key={f.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  <Controller
                    control={control}
                    name={`items.${i}.productUnitId`}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => v && pickProductUnit(i, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk-satuan" />
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
                          {filtered.map((pu) => (
                            <SelectItem key={pu.id} value={pu.id}>
                              {pu.productSku} - {pu.productName} ({pu.unitName})
                              {pu.isDefaultPurchase && " ★"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    {...register(`items.${i}.qty`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    {...register(`items.${i}.price`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    {...register(`items.${i}.discount`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-1 text-sm pt-2">{formatIDR(subtotal)}</div>
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
            onClick={() =>
              append({ productUnitId: "", qty: 1, price: 0, discount: 0 })
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex justify-end">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{formatIDR(totalCalc.toNumber())}</div>
          </div>
        </CardContent>
      </Card>

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
