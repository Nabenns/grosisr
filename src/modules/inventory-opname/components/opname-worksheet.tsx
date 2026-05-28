"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateWorksheetAction, postOpnameAction } from "@/modules/inventory-opname/actions"

interface WarehouseOption {
  id: string
  name: string
}
interface CategoryOption {
  id: string
  name: string
}
interface WorksheetRow {
  productId: string
  sku: string
  name: string
  unitName: string
  qtySystem: number
}

interface Props {
  warehouses: WarehouseOption[]
  categories: CategoryOption[]
  defaultWarehouseId: string | null
}

export function OpnameWorksheet({ warehouses, categories, defaultWarehouseId }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId ?? "")
  const [categoryId, setCategoryId] = useState<string>("_all")
  const [search, setSearch] = useState("")
  const [worksheet, setWorksheet] = useState<WorksheetRow[] | null>(null)
  const [physical, setPhysical] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [globalNote, setGlobalNote] = useState("")

  function generate() {
    if (!warehouseId) {
      toast.error("Pilih gudang dulu")
      return
    }
    start(async () => {
      const result = await generateWorksheetAction({
        warehouseId,
        categoryId: categoryId === "_all" ? null : categoryId
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setWorksheet(result.data)
      const initial: Record<string, number> = {}
      for (const r of result.data) initial[r.productId] = r.qtySystem
      setPhysical(initial)
      setNotes({})
      toast.success(`Worksheet dibuat: ${result.data.length} produk`)
    })
  }

  function post() {
    if (!worksheet) return
    const items = worksheet
      .filter((r) => physical[r.productId] !== r.qtySystem)
      .map((r) => ({
        productId: r.productId,
        qtyPhysical: physical[r.productId] ?? r.qtySystem,
        note: notes[r.productId] || null
      }))
    if (items.length === 0) {
      toast.error("Tidak ada selisih untuk di-post")
      return
    }
    start(async () => {
      const result = await postOpnameAction({
        warehouseId,
        note: globalNote || null,
        items
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success(`Opname di-post sebagai adjustment ${result.data.code}`)
      router.push(`/inventory/adjustments/${result.data.id}` as never)
    })
  }

  const filtered =
    worksheet && search.length >= 2
      ? worksheet.filter(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.sku.toLowerCase().includes(search.toLowerCase())
        )
      : worksheet ?? []

  let totalDiff = 0
  if (worksheet) {
    for (const r of worksheet) {
      totalDiff += (physical[r.productId] ?? r.qtySystem) - r.qtySystem
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Pilih Lingkup</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Gudang *</Label>
            <Select value={warehouseId} onValueChange={(v) => v && setWarehouseId(v)}>
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
            <Label>Kategori (opsional)</Label>
            <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Semua</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={pending || !warehouseId}>
            {pending ? "Loading..." : "Generate Worksheet"}
          </Button>
        </CardContent>
      </Card>

      {worksheet && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Step 2: Input Qty Fisik ({worksheet.length} produk, total selisih:{" "}
                <span className={totalDiff < 0 ? "text-destructive" : totalDiff > 0 ? "text-emerald-600" : ""}>
                  {totalDiff > 0 ? "+" : ""}
                  {totalDiff}
                </span>
                )
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Cari SKU/nama produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b sticky top-0 bg-background">
                    <tr>
                      <th className="pb-2">SKU</th>
                      <th>Produk</th>
                      <th>Qty Sistem</th>
                      <th>Qty Fisik *</th>
                      <th>Selisih</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const phys = physical[r.productId] ?? r.qtySystem
                      const diff = phys - r.qtySystem
                      return (
                        <tr key={r.productId} className="border-b">
                          <td className="py-2">{r.sku}</td>
                          <td>{r.name}</td>
                          <td>
                            {r.qtySystem} {r.unitName}
                          </td>
                          <td>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={phys}
                              onChange={(e) =>
                                setPhysical((prev) => ({
                                  ...prev,
                                  [r.productId]: Number(e.target.value)
                                }))
                              }
                              className="w-32"
                            />
                          </td>
                          <td
                            className={
                              diff > 0
                                ? "text-emerald-600"
                                : diff < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}
                          </td>
                          <td>
                            <Input
                              value={notes[r.productId] ?? ""}
                              onChange={(e) =>
                                setNotes((prev) => ({
                                  ...prev,
                                  [r.productId]: e.target.value
                                }))
                              }
                              placeholder="opsional"
                              className="text-xs"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3: Posting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Catatan Opname (untuk header adjustment)</Label>
                <Textarea
                  value={globalNote}
                  onChange={(e) => setGlobalNote(e.target.value)}
                  rows={2}
                  placeholder="Misal: Opname akhir bulan Mei 2026"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Hanya item dengan selisih (qty fisik != qty sistem) yang akan diposting sebagai adjustment.
              </p>
              <Button onClick={post} disabled={pending}>
                {pending ? "Posting..." : "Posting Adjustment"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
