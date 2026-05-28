"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface WarehouseOption {
  id: string
  name: string
}

export function WarehouseSwitcher({
  warehouses,
  current
}: {
  warehouses: WarehouseOption[]
  current: string | null
}) {
  if (warehouses.length === 0) return null

  return (
    <Select
      value={current ?? undefined}
      onValueChange={(v) => {
        document.cookie = `current_warehouse=${v}; path=/; max-age=2592000; samesite=lax`
        window.location.reload()
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Pilih Gudang" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
