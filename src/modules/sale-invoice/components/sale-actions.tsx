"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { voidSaleAction } from "@/modules/sale-pos/actions"

export function SaleActions({
  id,
  status,
  canVoid
}: {
  id: string
  status: string
  canVoid: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  function doVoid() {
    if (!reason.trim()) {
      toast.error("Alasan VOID wajib diisi")
      return
    }
    start(async () => {
      const result = await voidSaleAction({ id, reason })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Penjualan di-VOID. Stok dikembalikan.")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2">
      <a href={`/sale/invoices/${id}/receipt`} target="_blank" rel="noopener">
        <Button variant="outline">Cetak Struk</Button>
      </a>
      {canVoid && status !== "VOID" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="destructive">VOID</Button> as never} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>VOID Penjualan?</DialogTitle>
              <DialogDescription>
                Stok dikembalikan ke gudang (gerakan IN). Aksi ini di-audit log.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button variant="destructive" disabled={pending} onClick={doVoid}>
                {pending ? "Memproses..." : "VOID"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
