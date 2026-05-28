import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import {
  getUserById,
  listAllRolesForSelect,
  listAllWarehousesForSelect
} from "@/modules/users/queries"
import { UserForm } from "@/modules/users/components/user-form"
import { PageHeader } from "@/components/page-header"

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("user.write")) redirect("/forbidden")
  const { id } = await params
  const [user, roles, warehouses] = await Promise.all([
    getUserById(id),
    listAllRolesForSelect(),
    listAllWarehousesForSelect()
  ])
  if (!user) notFound()
  return (
    <div>
      <PageHeader title={`Ubah Pengguna: ${user.username}`} />
      <UserForm
        roles={roles}
        warehouses={warehouses}
        initial={{
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          isActive: user.isActive,
          defaultWarehouseId: user.defaultWarehouseId,
          roleIds: user.roles.map((r) => r.roleId),
          warehouseIds: user.warehouseAccess.map((w) => w.warehouseId)
        }}
      />
    </div>
  )
}
