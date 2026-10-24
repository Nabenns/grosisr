"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

type DiffValue = unknown

function renderValue(value: DiffValue): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}

/**
 * Audit rows store `{ field: [before, after] }` pairs (see lib/audit.ts), but
 * older rows can hold arbitrary JSON — render whatever shape we get instead of
 * assuming pairs.
 */
function normalise(diff: unknown): { field: string; before: string; after: string }[] {
  if (!diff || typeof diff !== "object") return []
  return Object.entries(diff as Record<string, unknown>).map(([field, value]) => {
    if (Array.isArray(value) && value.length === 2) {
      return { field, before: renderValue(value[0]), after: renderValue(value[1]) }
    }
    return { field, before: "—", after: renderValue(value) }
  })
}

export function AuditDiffDialog({ diff, label }: { diff: unknown; label: string }) {
  const [open, setOpen] = useState(false)
  const rows = normalise(diff)

  if (rows.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" />}>
        <Eye className="h-3.5 w-3.5" />
        {rows.length} field
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail perubahan</DialogTitle>
          <DialogDescription className="font-mono text-xs">{label}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 text-left uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Sebelum</th>
                <th className="px-3 py-2 font-medium">Sesudah</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.field} className="border-t align-top">
                  <td className="px-3 py-2 font-mono font-medium">{row.field}</td>
                  <td className="max-w-[220px] break-words px-3 py-2 text-muted-foreground line-through">
                    {row.before}
                  </td>
                  <td className="max-w-[220px] break-words px-3 py-2">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
