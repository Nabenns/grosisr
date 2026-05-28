"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  total: number
  page: number
  pageSize: number
}

export function Pagination({ total, page, pageSize }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function goto(p: number) {
    const next = new URLSearchParams(sp.toString())
    next.set("page", String(p))
    router.push(`?${next.toString()}` as never)
  }

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <div className="text-muted-foreground">{total === 0 ? "0 hasil" : `${startItem}-${endItem} dari ${total}`}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goto(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goto(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
