"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
  allLabel?: string
}

interface Props {
  searchKey?: string
  searchPlaceholder?: string
  filters?: FilterConfig[]
}

export function DataTableToolbar({
  searchKey = "q",
  searchPlaceholder = "Cari...",
  filters = []
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentSearch = searchParams.get(searchKey) ?? ""

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value && value !== "_all") {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete("page")
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}` as never)
      })
    },
    [pathname, router, searchParams]
  )

  const hasFilters =
    Boolean(currentSearch) ||
    filters.some((f) => {
      const v = searchParams.get(f.key)
      return v && v !== "_all"
    })

  const resetAll = () => {
    startTransition(() => {
      router.push(pathname as never)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          defaultValue={currentSearch}
          placeholder={searchPlaceholder}
          onChange={(e) => {
            const v = e.target.value
            const timeout = setTimeout(() => {
              setParam(searchKey, v.trim() ? v.trim() : null)
            }, 300)
            return () => clearTimeout(timeout)
          }}
          className="pl-8 h-9"
        />
      </div>

      {filters.map((f) => {
        const val = searchParams.get(f.key) ?? "_all"
        return (
          <Select key={f.key} value={val} onValueChange={(v) => v && setParam(f.key, v)}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{f.allLabel ?? `Semua ${f.label}`}</SelectItem>
              {f.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      })}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetAll} className="h-9 px-2 text-xs">
          Reset
          <X className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
