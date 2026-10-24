"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
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
  /** Renders two date inputs bound to these query keys. */
  dates?: { fromKey: string; toKey: string; label?: string }
}

export function DataTableToolbar({
  searchKey = "q",
  searchPlaceholder = "Cari...",
  filters = [],
  dates
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSearch = searchParams.get(searchKey) ?? ""
  const [searchValue, setSearchValue] = useState(currentSearch)

  // Keep the box in sync when the URL changes from elsewhere (reset button).
  useEffect(() => {
    setSearchValue(currentSearch)
  }, [currentSearch])

  // One debounce timer for the whole component; the previous version created a
  // timer per keystroke and never cleared the previous one, so every character
  // pushed its own navigation.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

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
    Boolean(dates && (searchParams.get(dates.fromKey) || searchParams.get(dates.toKey))) ||
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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          placeholder={searchPlaceholder}
          onChange={(e) => {
            const value = e.target.value
            setSearchValue(value)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => {
              setParam(searchKey, value.trim() ? value.trim() : null)
            }, 350)
          }}
          className="h-9 pl-8"
        />
      </div>

      {filters.map((f) => {
        const val = searchParams.get(f.key) ?? "_all"
        // Base UI cannot resolve an item label from nested SelectItem children,
        // so it printed the raw value ("_all"). Resolve it here instead.
        const selectedLabel =
          val === "_all"
            ? (f.allLabel ?? `Semua ${f.label}`)
            : (f.options.find((o) => o.value === val)?.label ?? val)
        return (
          <Select key={f.key} value={val} onValueChange={(v) => v && setParam(f.key, v)}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue>{selectedLabel}</SelectValue>
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

      {dates && (
        <div className="flex items-center gap-1">
          <Input
            type="date"
            lang="id"
            aria-label={dates.label ? `${dates.label} dari` : "Dari tanggal"}
            value={searchParams.get(dates.fromKey) ?? ""}
            onChange={(e) => setParam(dates.fromKey, e.target.value || null)}
            className="h-9 w-[140px] text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            lang="id"
            aria-label={dates.label ? `${dates.label} sampai` : "Sampai tanggal"}
            value={searchParams.get(dates.toKey) ?? ""}
            onChange={(e) => setParam(dates.toKey, e.target.value || null)}
            className="h-9 w-[140px] text-xs"
          />
        </div>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetAll} className="h-9 px-2 text-xs">
          Reset
          <X className="ml-1 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
