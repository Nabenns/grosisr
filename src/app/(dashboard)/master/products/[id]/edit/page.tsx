import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getProductById } from "@/modules/master-product/queries"
import { ProductForm } from "@/modules/master-product/components/product-form"
import { PageHeader } from "@/components/page-header"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("product.write")) redirect("/forbidden")

  const { id } = await params
  const product = await getProductById(id)
  if (!product) notFound()

  const [categories, brands, units] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.brand.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.unit.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ])

  const initial = {
    id: product.id,
    version: product.version,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    brandId: product.brandId,
    baseUnitId: product.baseUnitId,
    description: product.description,
    imageUrl: product.imageUrl,
    hasCukai: product.hasCukai,
    hasHet: product.hasHet,
    hetPrice: product.hetPrice ? Number(product.hetPrice) : null,
    minStock: product.minStock,
    units: product.units.map((u) => ({
      id: u.id,
      unitId: u.unitId,
      conversionToBase: Number(u.conversionToBase),
      barcode: u.barcode,
      purchasePrice: Number(u.purchasePrice),
      salePrice: Number(u.salePrice),
      isDefaultPurchase: u.isDefaultPurchase,
      isDefaultSale: u.isDefaultSale
    }))
  }

  return (
    <div>
      <PageHeader title={`Ubah Produk: ${product.name}`} />
      <ProductForm categories={categories} brands={brands} units={units} initial={initial} />
    </div>
  )
}
