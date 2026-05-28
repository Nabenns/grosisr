"use client"

import { useState, useTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import Decimal from "decimal.js"
import { createPInvSchema, type CreatePInvInput } from "../schema"
import { postPurchaseInvoiceAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
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
}
interface POPrefill {
  poId: string
  poCode: string
  supplier: { id: string; name: string }
  warehouse: { id: string; name: string }
  items: {
    poItemId: string
    productUnitId: string
    productSku: string
    productName: string
    unitName: string
    qtyOrdered: number
    qtyReceived: number
    qtyRemaining: number
    price: number
    discount: number
  }[]
}

interface Props {
  suppliers: SupplierOption[]
  warehouses: WarehouseOption[]
  productUnits: ProductUnitOption[]
  defaultWarehouseId: string | null
  poPrefill: POPrefill | null
}

function fmtDateInput(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function PInvForm({
  suppliers,
  warehouses,
  productUnits,
  defaultWarehouseId,
  poPrefill
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [search, setSearch] = useState("")

  const today = new Date()
  const due30 = new Date()
  due30.setDate(due30.getDate() + 30)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    formState: { errors }
  } = useForm<CreatePInvInput>({
    resolver: zodResolver(createPInvSchema),
    defaultValues: poPrefill
      ? {
          poId: poPrefill.poId,
          supplierId: poPrefill.supplier.id,
          warehouseId: poPrefill.warehouse.id,
          supplierInvoiceNo: null,
          invoiceDate: today,
          dueDate: due30,
          taxAmount: 0,
          discountAmount: 0,
          note: null,
          items: poPrefill.items.map((i) => ({
            productUnitId: i.productUnitId,
            qty: i.qtyRemaining,
            price: i.price,
            discount: i.discount,
            poItemId: i.poItemId
          }))
        }
      : {
          poId: null,
          supplierId: "",
          warehouseId: defaultWarehouseId ?? "",
          supplierInvoiceNo: null,
          invoiceDate: today,
          dueDate: due30,
          taxAmount: 0,
          discountAmount: 0,
          note: null,
          items: [{ productUnitId: "", qty: 1, price: 0, discount: 0, poItemId: null }]
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
  const subtotalCalc = items.reduce(
    (acc, i) =>
      acc.plus(
        new Decimal(i.qty || 0)
          .times(i.price || 0)
          .minus(new Decimal(i.qty || 0).times(i.discount || 0))
      ),
    new Decimal(0)
  )
  const totalCalc = subtotalCalc
    .minus(watch("discountAmount") ?? 0)
    .plus(watch("taxAmount") ?? 0)

  function pickProductUnit(index: number, puId: string) {
    setValue(`items.${index}.productUnitId`, puId)
    const pu = productUnitMap.get(puId)
    if (pu) {
      const currentPrice = getValues(`items.${index}.price`)
      if (!currentPrice || currentPrice === 0) {
        setValue(`items.${index}.price`, pu.purchasePrice)
      }
    }
  }

  function onSubmit(values: CreatePInvInput) {
    start(async () => {
      const result = await postPurchaseInvoiceAction(values)
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Faktur pembelian ${result.data.code} di-post. Stok bertambah.`)
      router.push(`/purchase/invoices/${result.data.id}` as never)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>
            Header
            {poPrefill && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (dari PO {poPrefill.poCode})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={watch("supplierId") ?? ""}
              onValueChange={(v) => v && setValue("supplierId", v)}
              disabled={!!poPrefill}
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
              disabled={!!poPrefill}
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
            <Label htmlFor="supplierInvoiceNo">No. Faktur Supplier</Label>
            <Input id="supplierInvoiceNo" {...register("supplierInvoiceNo")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Tgl Faktur *</Label>
            <Input
              id="invoiceDate"
              type="date"
              defaultValue={fmtDateInput(today)}
              onChange={(e) => setValue("invoiceDate", new Date(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Jatuh Tempo *</Label>
            <Input
              id="dueDate"
              type="date"
              defaultValue={fmtDateInput(due30)}
              onChange={(e) => setValue("dueDate", new Date(e.target.value))}
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
            <div className="col-span-2">Harga *</div>
            <div className="col-span-2">Diskon /unit</div>
            <div className="col-span-1">Subtotal</div>
            <div className="col-span-1"></div>
          </div>
          {fields.map((f, i) => {
            const item = watch(`items.${i}`)
            const qty = Number(item?.qty ?? 0)
            const price = Number(item?.price ?? 0)
            const discount = Number(item?.discount ?? 0)
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
                        disabled={!!poPrefill}
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
                    disabled={fields.length <= 1 || !!poPrefill}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
          {!poPrefill && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productUnitId: "",
                  qty: 1,
                  price: 0,
                  discount: 0,
                  poItemId: null
                })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Item
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-2 max-w-md ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatIDR(subtotalCalc.toNumber())}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <Label htmlFor="discountAmount">Diskon Faktur</Label>
            <Input
              id="discountAmount"
              type="number"
              step="1"
              min="0"
              {...register("discountAmount", { valueAsNumber: true })}
              className="w-40"
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <Label htmlFor="taxAmount">Pajak (PPN)</Label>
            <Input
              id="taxAmount"
              type="number"
              step="1"
              min="0"
              {...register("taxAmount", { valueAsNumber: true })}
              className="w-40"
            />
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total</span>
            <span>{formatIDR(totalCalc.toNumber())}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Posting akan menambah stok di gudang tujuan dan membuat hutang ke supplier (M3 akan tampilkan
        di hutang). Aksi ini irreversible kecuali via VOID.
      </p>

      <div className="flex gap-2">
        <ConfirmDialog
          trigger={
            <Button type="button" disabled={pending}>
              {pending ? "Memposting..." : "Post Faktur"}
            </Button>
          }
          title="Post Faktur Pembelian?"
          description="Stok gudang akan bertambah secara permanent. Aksi ini hanya bisa dibatalkan via VOID."
          confirmLabel="Post"
          onConfirm={() => handleSubmit(onSubmit)()}
        />
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  )
}
