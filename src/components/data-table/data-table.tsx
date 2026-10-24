import type { ColumnDef } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortLink } from "./sort-link"

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  emptyMessage?: string
  emptyState?: React.ReactNode
  /** Aktifkan sort server-side lewat query param sortBy/sortDir */
  sortable?: boolean
  rowClassName?: (row: TData, index: number) => string
}

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = "Belum ada data",
  emptyState,
  sortable = false,
  rowClassName
}: DataTableProps<TData>) {
  const keyOf = (col: ColumnDef<TData>, idx: number) =>
    col.id ?? (col as unknown as { accessorKey?: string }).accessorKey ?? String(idx)

  const headerCell = (col: ColumnDef<TData>, idx: number) => {
    const header = typeof col.header === "string" ? col.header : (col.header as React.ReactNode)
    const sortKey = (col as unknown as { accessorKey?: string; id?: string }).accessorKey ?? col.id
    if (sortable && sortKey) {
      return <SortLink label={header} column={sortKey} />
    }
    return header
  }

  const cellContent = (col: ColumnDef<TData>, row: TData, index: number): React.ReactNode => {
    if (typeof col.cell === "function") {
      return col.cell({ row: { original: row as never, index } as never } as never) as React.ReactNode
    }
    const c = col as unknown as {
      accessorKey?: string
      accessorFn?: (row: TData, index: number) => unknown
    }
    if (c.accessorKey) return (row as never)[c.accessorKey as keyof TData] as React.ReactNode
    if (typeof c.accessorFn === "function") return c.accessorFn(row, index) as React.ReactNode
    return null
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent border-b">
            {columns.map((col, idx) => (
              <TableHead key={keyOf(col, idx)} className="h-10 whitespace-nowrap">
                {headerCell(col, idx)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {emptyState ?? (
                  <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={String(i)}
                className={`transition-colors hover:bg-accent/40 ${rowClassName?.(row, i) ?? ""}`}
              >
                {columns.map((col, j) => (
                  <TableCell key={String(j)} className="py-2.5">
                    {cellContent(col, row, i)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
