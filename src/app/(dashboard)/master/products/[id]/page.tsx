import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Pencil } from "lucide-react"
import { auth } from "@/lib/auth"
import { getProductById, getProductStocks } from "@/modules/master-product/queries"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatIDR } from "@/lib/money"

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("product.read")) redirect("/forbidden")

  const { id } = await params
  const product = await getProductById(id)
  if (!product) notFound()
  const stocks = await getProductStocks(id)
  const canWrite = session.user.permissionKeys.includes("product.write")

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} - Kategori: ${product.category.name}${
          product.brand ? ` - Brand: ${product.brand.name}` : ""
        }`}
        actions={
          canWrite ? (
            <Link href={`/master/products/${id}/edit` as never}>
              <Button>
                <Pencil className="h-4 w-4 mr-1" />
                Ubah
              </Button>
            </Link>
          ) : null
        }
      />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="units">Satuan & Harga</TabsTrigger>
          <TabsTrigger value="stock">Stok per Gudang</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span> {product.isActive ? "Aktif" : "Nonaktif"}
              </div>
              <div>
                <span className="text-muted-foreground">Base Unit:</span> {product.baseUnit.name}
              </div>
              <div>
                <span className="text-muted-foreground">Min Stock:</span> {product.minStock}
              </div>
              <div>
                <span className="text-muted-foreground">Cukai:</span> {product.hasCukai ? "Ya" : "Tidak"}
              </div>
              <div>
                <span className="text-muted-foreground">HET:</span>{" "}
                {product.hasHet ? formatIDR(Number(product.hetPrice ?? 0)) : "Tidak ada"}
              </div>
              {product.description && (
                <div>
                  <span className="text-muted-foreground">Deskripsi:</span> {product.description}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units">
          <Card>
            <CardContent className="pt-6">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="pb-2">Satuan</th>
                    <th>Konversi</th>
                    <th>Barcode</th>
                    <th>Harga Beli</th>
                    <th>Harga Jual</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {product.units.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2">{u.unit.name}</td>
                      <td>{Number(u.conversionToBase)}</td>
                      <td>{u.barcode ?? "-"}</td>
                      <td>{formatIDR(Number(u.purchasePrice))}</td>
                      <td>{formatIDR(Number(u.salePrice))}</td>
                      <td>
                        {u.isDefaultPurchase && "Beli "}
                        {u.isDefaultSale && "Jual"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardContent className="pt-6">
              {stocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada saldo stok.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left border-b">
                    <tr>
                      <th className="pb-2">Gudang</th>
                      <th>Saldo (base unit)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((s) => (
                      <tr key={`${s.productId}-${s.warehouseId}`} className="border-b">
                        <td className="py-2">{s.warehouse.name}</td>
                        <td>
                          {Number(s.qtyInBase)} {product.baseUnit.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
