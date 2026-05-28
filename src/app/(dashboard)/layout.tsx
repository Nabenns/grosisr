import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userWarehouses = await prisma.warehouse.findMany({
    where: { id: { in: session.user.warehouseIds }, isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })

  const cookieStore = await cookies()
  const currentWarehouseId =
    cookieStore.get("current_warehouse")?.value ??
    session.user.defaultWarehouseId ??
    userWarehouses[0]?.id ??
    null

  return (
    <div className="flex">
      <Sidebar permissionKeys={session.user.permissionKeys} />
      <div className="flex-1 min-h-screen flex flex-col">
        <Topbar
          userName={session.user.name ?? ""}
          username={session.user.username}
          warehouses={userWarehouses}
          currentWarehouseId={currentWarehouseId}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
