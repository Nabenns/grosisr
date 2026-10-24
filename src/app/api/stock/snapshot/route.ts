import { auth } from "@/lib/auth"
import { getStockSnapshot } from "@/lib/stock-live"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Lightweight JSON snapshot polled by the dashboard (see StockLiveProvider).
 * Polling instead of SSE on purpose: a permanently open stream blocks server
 * actions in `next dev` and ties up a worker behind the proxy in production.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response("Unauthorized", { status: 401 })

  const snapshot = await getStockSnapshot()
  return Response.json(snapshot, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  })
}
