"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  label: React.ReactNode
  column: string
  className?: string
}

export function SortLink({ label, column, className }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const sortBy = sp.get("sortBy")
  const sortDir = sp.get("sortDir") ?? "asc"
  const isActive = sortBy === column
  const nextDir = isActive && sortDir === "asc" ? "desc" : "asc"

  const onClick = () => {
    const next = new URLSearchParams(sp.toString())
    next.set("sortBy", column)
    next.set("sortDir", nextDir)
    next.delete("page")
    router.push(`${pathname}?${next.toString()}` as never)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-1 text-left text-sm font-medium hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      {label}
      {isActive ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      )}
    </button>
  )
}
