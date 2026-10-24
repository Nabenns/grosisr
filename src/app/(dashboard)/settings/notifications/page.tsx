import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { NotificationForm } from "./notification-form"

export default async function NotificationSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("setting.write")) redirect("/forbidden")

  const rows = await prisma.setting.findMany({
    where: {
      key: { in: ["telegram_bot_token", "telegram_chat_id", "low_stock_alert_enabled"] }
    }
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))

  return (
    <div>
      <PageHeader
        title="Notifikasi"
        description="Kirim peringatan stok menipis ke Telegram secara otomatis."
      />
      <NotificationForm
        hasToken={Boolean(map.get("telegram_bot_token"))}
        chatId={map.get("telegram_chat_id") ?? ""}
        lowStockEnabled={(map.get("low_stock_alert_enabled") ?? "true") === "true"}
      />
    </div>
  )
}
