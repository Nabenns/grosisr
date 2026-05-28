"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { sendPOAction, cancelPOAction } from "@/modules/purchase-order/actions"

export function POActions({
  id,
  status,
  canWrite,
  canInvoice
}: {
  id: string
  status: string
  canWrite: boolean
  canInvoice: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  async function doSend() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const result = await sendPOAction(id)
        if (!result.success) toast.error(result.error.message)
        else {
          toast.success("PO dikirim ke supplier (status SENT).")
          router.refresh()
        }
        resolve()
      })
    })
  }

  async function doCancel() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const result = await cancelPOAction(id)
        if (!result.success) toast.error(result.error.message)
        else {
          toast.success("PO dibatalkan.")
          router.refresh()
        }
        resolve()
      })
    })
  }

  return (
    <div className="flex gap-2">
      {canWrite && status === "DRAFT" && (
        <>
          <Link href={`/purchase/orders/${id}/edit` as never}>
            <Button variant="outline">Edit</Button>
          </Link>
          <ConfirmDialog
            trigger={<Button disabled={pending}>Kirim</Button>}
            title="Kirim PO ke Supplier?"
            description="Status berubah menjadi SENT. PO bisa dipakai untuk membuat faktur pembelian."
            onConfirm={doSend}
          />
        </>
      )}
      {canWrite && (status === "DRAFT" || status === "SENT" || status === "PARTIAL") && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={pending}>
              Batalkan
            </Button>
          }
          title="Batalkan PO?"
          description="PO ditandai CANCELLED. Item yang sudah masuk faktur tidak terpengaruh."
          destructive
          onConfirm={doCancel}
        />
      )}
      {canInvoice && (status === "SENT" || status === "PARTIAL") && (
        <Link href={`/purchase/invoices/new?poId=${id}` as never}>
          <Button>Buat Faktur</Button>
        </Link>
      )}
    </div>
  )
}
