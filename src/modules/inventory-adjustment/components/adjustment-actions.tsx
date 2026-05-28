"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { postAdjustmentAction, cancelAdjustmentAction } from "@/modules/inventory-adjustment/actions"

export function AdjustmentActions({
  id,
  status,
  canPost,
  canCancel
}: {
  id: string
  status: string
  canPost: boolean
  canCancel: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  async function doPost() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const result = await postAdjustmentAction(id)
        if (!result.success) {
          toast.error(result.error.message)
          resolve()
          return
        }
        toast.success("Adjustment di-post. Stok berhasil diupdate.")
        router.refresh()
        resolve()
      })
    })
  }

  async function doCancel() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const result = await cancelAdjustmentAction(id)
        if (!result.success) {
          toast.error(result.error.message)
          resolve()
          return
        }
        toast.success("Adjustment dibatalkan.")
        router.refresh()
        resolve()
      })
    })
  }

  if (status !== "DRAFT") return null
  return (
    <div className="flex gap-2">
      {canPost && (
        <ConfirmDialog
          trigger={<Button disabled={pending}>Post</Button>}
          title="Posting Adjustment?"
          description="Stok akan diubah permanent. Aksi ini tidak bisa diundo (harus dengan adjustment baru)."
          confirmLabel="Post"
          onConfirm={doPost}
        />
      )}
      {canCancel && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" disabled={pending}>
              Batalkan
            </Button>
          }
          title="Batalkan Adjustment?"
          description="Adjustment DRAFT akan ditandai CANCELLED."
          destructive
          onConfirm={doCancel}
        />
      )}
    </div>
  )
}
