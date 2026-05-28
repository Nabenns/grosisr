"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { receiveTransferAction } from "../actions"

interface TransferItem {
  id: string
  qtyInBase: number
  product: {
    sku: string
    name: string
    baseUnit: { name: string }
  }
}

interface Props {
  transferId: string
  fromWarehouseName: string
  toWarehouseName: string
  items: TransferItem[]
}

export function TransferReceiveForm({
  transferId,
  fromWarehouseName,
  toWarehouseName,
  items
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [received, setReceived] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, i.qtyInBase]))
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const receivedItems = items.map((i) => ({
      itemId: i.id,
      qtyReceived: received[i.id] ?? 0
    }))
    start(async () => {
      const result = await receiveTransferAction({ id: transferId, receivedItems })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Transfer diterima. Stok gudang tujuan diupdate.")
      router.push(`/inventory/transfers/${transferId}` as never)
      router.refresh()
    })
  }

  const hasDiscrepancy = items.some(
    (i) => (received[i.id] ?? 0) !== i.qtyInBase
  )

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            Terima Transfer: {fromWarehouseName} -&gt; {toWarehouseName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="pb-2">SKU</th>
                <th>Produk</th>
                <th>Qty Kirim</th>
                <th>Qty Terima *</th>
                <th>Selisih</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const recv = received[i.id] ?? 0
                const diff = i.qtyInBase - recv
                return (
                  <tr key={i.id} className="border-b">
                    <td className="py-2">{i.product.sku}</td>
                    <td>{i.product.name}</td>
                    <td>
                      {i.qtyInBase} {i.product.baseUnit.name}
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={i.qtyInBase}
                        value={recv}
                        onChange={(e) =>
                          setReceived((prev) => ({
                            ...prev,
                            [i.id]: Number(e.target.value)
                          }))
                        }
                        className="w-32"
                      />
                    </td>
                    <td className={diff > 0 ? "text-destructive" : "text-muted-foreground"}>
                      {diff > 0 ? `-${diff}` : "0"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {hasDiscrepancy && (
            <p className="text-sm text-amber-600 mt-3">
              Ada selisih qty terima vs kirim. Selisih akan otomatis dicatat sebagai
              ADJUSTMENT di gudang asal.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Memproses..." : "Konfirmasi Terima"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  )
}
