"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { sendTransferAction, cancelTransferAction } from "@/modules/inventory-transfer/actions"

interface Props {
  id: string
  status: string
  toWarehouseId: string
  userWarehouseIds: string[]
  canSend: boolean
  canReceive: boolean
  canCancel: boolean
}

export function TransferActions({
  id,
  status,
  toWarehouseId,
  userWarehouseIds,
  canSend,
  canReceive,
  canCancel
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const userInDestWarehouse = userWarehouseIds.includes(toWarehouseId)

  async function doSend() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const result = await sendTransferAction(id)
        if (!result.success) {
          toast.error(result.error.message)
          resolve()
          return
        }
        toast.success("Transfer dikirim. Stok gudang asal dikurangi.")
        router.refresh()
        resolve()
      })
    })
  }

  async function doCancel() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const result = await cancelTransferAction(id)
        if (!result.success) {
          toast.error(result.error.message)
          resolve()
          return
        }
        toast.success("Transfer dibatalkan.")
        router.refresh()
        resolve()
      })
    })
  }

  return (
    <div className="flex gap-2">
      {status === "DRAFT" && canSend && (
        <ConfirmDialog
          trigger={<Button disabled={pending}>Kirim</Button>}
          title="Kirim Transfer?"
          description="Stok gudang asal akan dikurangi. Setelah dikirim, transfer berstatus IN_TRANSIT."
          confirmLabel="Kirim"
          onConfirm={doSend}
        />
      )}
      {status === "DRAFT" && canCancel && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={pending}>
              Batalkan
            </Button>
          }
          title="Batalkan Transfer?"
          description="Transfer DRAFT akan ditandai CANCELLED."
          destructive
          onConfirm={doCancel}
        />
      )}
      {status === "IN_TRANSIT" && canReceive && userInDestWarehouse && (
        <Link href={`/inventory/transfers/${id}/receive` as never}>
          <Button>Terima</Button>
        </Link>
      )}
    </div>
  )
}
