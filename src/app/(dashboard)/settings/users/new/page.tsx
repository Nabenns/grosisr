import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listAllRolesForSelect, listAllWarehousesForSelect } from "@/modules/users/queries"
import { UserForm } from "@/modules/users/components/user-form"
import { PageHeader } from "@/components/page-header"

export default async function NewUserPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("user.write")) redirect("/forbidden")
  const [roles, warehouses] = await Promise.all([listAllRolesForSelect(), listAllWarehousesForSelect()])
  return (
    <div>
      <PageHeader title="Tambah Pengguna" />
      <UserForm roles={roles} warehouses={warehouses} />
    </div>
  )
}
