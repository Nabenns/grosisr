"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { updateGeneralSettingsAction } from "@/modules/settings-store/actions"

export function GeneralForm({ allowNegativeStock }: { allowNegativeStock: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [allow, setAllow] = useState(allowNegativeStock)

  function save() {
    start(async () => {
      const result = await updateGeneralSettingsAction({ allow_negative_stock: allow })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Pengaturan disimpan")
      router.refresh()
    })
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Izinkan stok negatif</Label>
            <p className="text-xs text-muted-foreground">
              Jika diaktifkan, sistem mengizinkan posting transaksi yang membuat saldo stok jadi negatif. Default:
              tidak.
            </p>
          </div>
          <Switch checked={allow} onCheckedChange={setAllow} />
        </div>
        <Button onClick={save} disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </CardContent>
    </Card>
  )
}
