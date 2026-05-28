import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Package, Boxes, Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [productCount, customerCount, supplierCount, lowStockCount] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null, isActive: true } }),
    prisma.customer.count({ where: { deletedAt: null, isActive: true } }),
    prisma.supplier.count({ where: { deletedAt: null, isActive: true } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "StockBalance" sb
      JOIN "Product" p ON p.id = sb."productId"
      WHERE sb."qtyInBase" < COALESCE(sb."minStock", p."minStock")
        AND p."deletedAt" IS NULL
    `
  ])

  const lowStock = Number(lowStockCount[0]?.count ?? 0n)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Selamat datang, {session.user.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Ringkasan operasional</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produk Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              Stok Minimum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStock}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href={"/master/products/new" as never}>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Tambah Produk
            </Button>
          </Link>
          <Link href={"/master/customers/new" as never}>
            <Button variant="outline">Tambah Customer</Button>
          </Link>
          <Link href={"/master/suppliers/new" as never}>
            <Button variant="outline">Tambah Supplier</Button>
          </Link>
          <Link href={"/inventory/stock" as never}>
            <Button variant="outline">Lihat Stok</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catatan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Saat ini sistem masih di milestone M1 (Pendataan & Foundation).</p>
          <p>Transaksi pembelian, penjualan, dan keuangan aktif di milestone berikutnya.</p>
        </CardContent>
      </Card>
    </div>
  )
}
