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
import { voidPurchaseInvoiceAction } from "@/modules/purchase-invoice/actions"

export function PInvActions({
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
      const result = await voidPurchaseInvoiceAction({ id, reason })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Faktur di-VOID. Stok dikembalikan.")
      setOpen(false)
      router.refresh()
    })
  }

  if (status === "VOID") return null
  if (!canVoid) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive">VOID Faktur</Button> as never} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>VOID Faktur Pembelian?</DialogTitle>
          <DialogDescription>
            Stok di gudang akan dikembalikan (gerakan OUT generated). Aksi ini di-audit log.
            VOID hanya bisa kalau belum ada pembayaran.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Alasan *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Misal: salah supplier, double posting, dll"
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
  )
}
