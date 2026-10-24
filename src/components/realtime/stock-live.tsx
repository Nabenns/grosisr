"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { StockSnapshot } from "@/lib/stock-live"

interface StockLiveState {
  lowStock: number | null
  connected: boolean
  lastUpdate: number | null
}

const StockLiveContext = createContext<StockLiveState>({
  lowStock: null,
  connected: false,
  lastUpdate: null
})

const POLL_MS = 10_000

/**
 * Polls /api/stock/snapshot and refreshes the current route when the stock
 * movement counter changes, so every page reflects stock without a manual
 * reload. Polling (not SSE) keeps server actions responsive and avoids
 * holding a worker connection open behind the reverse proxy.
 */
export function StockLiveProvider({
  initialLowStock,
  children
}: {
  initialLowStock: number
  children: React.ReactNode
}) {
  const router = useRouter()
  const [lowStock, setLowStock] = useState<number | null>(initialLowStock)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const versionRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stock/snapshot", { cache: "no-store" })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as StockSnapshot
      setConnected(true)
      setLowStock(data.lowStock)
      setLastUpdate(Date.now())
      if (versionRef.current !== null && versionRef.current !== data.movements) {
        router.refresh()
      }
      versionRef.current = data.movements
    } catch {
      setConnected(false)
    }
  }, [router])

  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      void load()
    }, POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load])

  return (
    <StockLiveContext.Provider value={{ lowStock, connected, lastUpdate }}>
      {children}
    </StockLiveContext.Provider>
  )
}

export function useStockLive() {
  return useContext(StockLiveContext)
}
