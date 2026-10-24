"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintReportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (typeof window !== "undefined") window.print()
      }}
    >
      <Printer className="h-4 w-4 mr-1" />
      Cetak Laporan
    </Button>
  )
}
