import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { auth } from "@/lib/auth"
import { listStockBalances } from "@/modules/inventory-stock/queries"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { Pagination } from "@/components/data-table/pagination"

interface Row {
  productId: string
  warehouseId: string
  productName: string
  sku: string
  warehouseName: string
  qty: number
  minStock: number
  unit: string
  belowMin: boolean
}

export default async function StockPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; warehouseId?: string; belowMin?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("inventory.read")) redirect("/forbidden")

  const sp = await searchParams
  const cookieStore = await cookies()
  const currentWarehouseId =
    sp.warehouseId ?? cookieStore.get("current_warehouse")?.value ?? session.user.defaultWarehouseId ?? undefined

  const page = Number(sp.page ?? "1")
  const { items, total, pageSize } = await listStockBalances({
    warehouseId: currentWarehouseId,
    q: sp.q,
    belowMinOnly: sp.belowMin === "1",
    page
  })

  const rows: Row[] = items.map((s) => {
    const min = s.minStock ?? s.product.minStock
    return {
      productId: s.productId,
      warehouseId: s.warehouseId,
      productName: s.product.name,
      sku: s.product.sku,
      warehouseName: s.warehouse.name,
      qty: Number(s.qtyInBase),
      minStock: min,
      unit: s.product.baseUnit.name,
      belowMin: Number(s.qtyInBase) < min
    }
  })

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "productName", header: "Produk" },
    { accessorKey: "warehouseName", header: "Gudang" },
    {
      accessorKey: "qty",
      header: "Saldo",
      cell: ({ row }) => `${row.original.qty} ${row.original.unit}`
    },
    { accessorKey: "minStock", header: "Min" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (row.original.belowMin ? <span className="text-destructive">Di bawah min</span> : "OK")
    }
  ]

  return (
    <div>
      <PageHeader
        title="Saldo Stok"
        description="Ringkasan saldo stok per gudang. Pergerakan stok aktif di milestone berikutnya (M2)."
      />
      <DataTable columns={columns} data={rows} emptyMessage="Belum ada saldo stok" />
      <Pagination total={total} page={page} pageSize={pageSize} />
    </div>
  )
}
