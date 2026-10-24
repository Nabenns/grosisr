import { prisma } from "@/lib/db"

export interface TelegramConfig {
  botToken: string
  chatId: string
}

export interface SendResult {
  ok: boolean
  error?: string
}

/**
 * Telegram credentials live in the Setting table so they can be changed from
 * the UI, with env vars as a fallback for container-level config.
 */
export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["telegram_bot_token", "telegram_chat_id"] } }
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const botToken = (map.get("telegram_bot_token") || process.env.TELEGRAM_BOT_TOKEN || "").trim()
  const chatId = (map.get("telegram_chat_id") || process.env.TELEGRAM_CHAT_ID || "").trim()
  if (!botToken || !chatId) return null
  return { botToken, chatId }
}

export async function sendTelegramMessage(text: string): Promise<SendResult> {
  const cfg = await getTelegramConfig()
  if (!cfg) return { ok: false, error: "Telegram belum dikonfigurasi (token / chat id kosong)" }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { ok: false, error: `Telegram HTTP ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengirim ke Telegram" }
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
