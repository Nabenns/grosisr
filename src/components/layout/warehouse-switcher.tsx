"use client"

import { Building2, Check, ChevronsUpDown } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface WarehouseOption {
  id: string
  name: string
}

/**
 * WarehouseSwitcher renders the ACTIVE warehouse NAME, never a raw id.
 */
export function WarehouseSwitcher({ warehouses, current }: { warehouses: WarehouseOption[]; current: string | null }) {
  if (warehouses.length === 0) return null

  const selected = warehouses.find((w) => w.id === current) ?? warehouses[0]
  if (!selected) return null

  const single = warehouses.length === 1

  if (single) {
    return (
      <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm">
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[160px] truncate font-medium">{selected.name}</span>
      </div>
    )
  }

  return (
    <Select
      value={selected.id}
      onValueChange={(v) => {
        document.cookie = `current_warehouse=${v}; path=/; max-age=2592000; samesite=lax`
        window.location.reload()
      }}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-[190px] gap-2 rounded-md border-border bg-card px-2.5 font-medium",
          "hover:bg-accent/60 focus-visible:ring-2"
        )}
        aria-label="Gudang aktif"
      >
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue>{selected.name}</SelectValue>
        <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.map((w) => (
          <SelectItem key={w.id} value={w.id} className="gap-2">
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === selected.id ? <Check className="size-3.5 text-primary" /> : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
