"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell,
  Search,
  Box,
  Users,
  Truck,
  FolderKanban,
  Receipt,
  Calculator,
  ScrollText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { WarehouseSwitcher } from "./warehouse-switcher"
import { UserMenu } from "./user-menu"
import { ThemeToggle } from "./theme-toggle"

interface Props {
  userName: string
  username: string
  warehouses: { id: string; name: string }[]
  currentWarehouseId: string | null
  lowStockCount: number
}

const QUICK_LINKS = [
  { label: "Produk", href: "/master/products", icon: Box },
  { label: "Customer", href: "/master/customers", icon: Users },
  { label: "Supplier", href: "/master/suppliers", icon: Truck },
  { label: "Gudang", href: "/master/warehouses", icon: FolderKanban },
  { label: "Penjualan", href: "/sale/invoices", icon: Receipt },
  { label: "Kasir / POS", href: "/sale/pos", icon: Calculator },
  { label: "Activity Log", href: "/settings/audit-log", icon: ScrollText }
]

export function Topbar({
  userName,
  username,
  warehouses,
  currentWarehouseId,
  lowStockCount
}: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const goSearch = () => {
    const q = query.trim()
    router.push(q ? `/master/products?q=${encodeURIComponent(q)}` : "/master/products")
    setFocused(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const results = query
    ? QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_LINKS

  return (
    <header className="border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Left: brand + global search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent transition-colors shrink-0"
        >
          <Box className="h-4 w-4 text-primary" />
          <span>Grosir</span>
        </Link>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder="Cari produk, customer... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goSearch()
            }}
            className="pl-9 pr-12 h-9"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            Ctrl K
          </kbd>
          {focused && (
            <div className="absolute z-50 mt-1.5 w-full bg-popover border rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 border-b">
                Pintasan — Enter untuk cari produk
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {results.map((l) => (
                  <button
                    key={l.href}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      router.push(`${l.href}${query ? `?q=${encodeURIComponent(query)}` : ""}` as never)
                      setFocused(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
                  >
                    <l.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {l.label}
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Enter untuk cari produk “{query}”
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: warehouse + notif + theme + user */}
      <div className="flex items-center gap-2">
        <WarehouseSwitcher warehouses={warehouses} current={currentWarehouseId} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Notifikasi" className="relative">
                <Bell className="h-4 w-4" />
                {lowStockCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center border-2 border-card">
                    {lowStockCount > 9 ? "9+" : lowStockCount}
                  </span>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {lowStockCount > 0 ? (
              <DropdownMenuItem
                onClick={() => router.push("/inventory/stock" as never)}
                className="gap-2.5 py-2.5"
              >
                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                <span className="text-xs">
                  <strong>{lowStockCount} produk</strong> di bawah stok minimum
                </span>
              </DropdownMenuItem>
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Tidak ada notifikasi
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
        <UserMenu name={userName} username={username} />
      </div>
    </header>
  )
}
