import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ProductForm } from "@/modules/master-product/components/product-form"
import { PageHeader } from "@/components/page-header"

export default async function NewProductPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("product.write")) redirect("/forbidden")

  const [categories, brands, units] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.brand.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.unit.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ])

  return (
    <div>
      <PageHeader title="Tambah Produk" />
      <ProductForm categories={categories} brands={brands} units={units} />
    </div>
  )
}
