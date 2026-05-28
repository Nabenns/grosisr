import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { POSCart } from "@/modules/sale-pos/components/pos-cart"

export default async function POSPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("sale.write")) redirect("/forbidden")

  const cookieStore = await cookies()
  const warehouseId =
    cookieStore.get("current_warehouse")?.value ??
    session.user.defaultWarehouseId ??
    null
  if (!warehouseId) redirect("/forbidden")

  const [warehouse, customers] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true } }),
    prisma.customer.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, code: true, name: true, customerType: true },
      orderBy: { name: "asc" }
    })
  ])

  return (
    <POSCart
      warehouseId={warehouseId}
      warehouseName={warehouse?.name ?? "Gudang"}
      customers={customers}
      userPermissions={session.user.permissionKeys}
    />
  )
}
