"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  sendTelegramTestAction,
  updateNotificationSettingsAction
} from "@/modules/settings-store/actions"

interface Props {
  hasToken: boolean
  chatId: string
  lowStockEnabled: boolean
}

export function NotificationForm({ hasToken, chatId, lowStockEnabled }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [testing, startTest] = useTransition()
  const [token, setToken] = useState("")
  const [chat, setChat] = useState(chatId)
  const [enabled, setEnabled] = useState(lowStockEnabled)

  function save(thenTest = false) {
    start(async () => {
      const result = await updateNotificationSettingsAction({
        telegram_bot_token: token,
        telegram_chat_id: chat,
        low_stock_alert_enabled: enabled
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      setToken("")
      toast.success("Pengaturan notifikasi disimpan")
      router.refresh()
      if (thenTest) test()
    })
  }

  function test() {
    startTest(async () => {
      const result = await sendTelegramTestAction()
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      if (!result.data.sent) {
        toast.error(result.data.error ?? "Gagal mengirim pesan tes")
        return
      }
      toast.success("Pesan tes terkirim ke Telegram")
    })
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            Bot Telegram
          </CardTitle>
          <CardDescription>
            Buat bot lewat <span className="font-medium">@BotFather</span>, lalu tempel token dan chat id
            (grup/channel id diawali tanda minus).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram_bot_token">Bot token</Label>
            <Input
              id="telegram_bot_token"
              type="password"
              autoComplete="off"
              placeholder={hasToken ? "•••••••• (tidak diubah)" : "123456789:AA..."}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {hasToken
                ? "Token sudah tersimpan. Kosongkan kolom ini kalau tidak ingin mengubahnya."
                : "Belum ada token tersimpan."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram_chat_id">Chat ID</Label>
            <Input
              id="telegram_chat_id"
              placeholder="Mis. -1001234567890"
              value={chat}
              onChange={(e) => setChat(e.target.value)}
            />
          </div>
          <div className="flex items-start justify-between gap-4 border-t pt-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Alert stok menipis</Label>
              <p className="text-xs text-muted-foreground">
                Kirim notifikasi otomatis saat stok turun di bawah minimum. Maksimal sekali per produk
                setiap 6 jam.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save(false)} disabled={pending || testing}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button variant="outline" onClick={() => save(true)} disabled={pending || testing}>
              <Send className="h-3.5 w-3.5" />
              {testing ? "Mengirim..." : "Simpan & kirim tes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Token disimpan di tabel pengaturan dan hanya dipakai server untuk memanggil Bot API. Nilai
            token tidak pernah dikirim balik ke browser.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
