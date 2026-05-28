import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listAllPermissions } from "@/modules/settings-role/queries"
import { RoleForm } from "@/modules/settings-role/components/role-form"
import { PageHeader } from "@/components/page-header"

export default async function NewRolePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("role.write")) redirect("/forbidden")
  const permissions = await listAllPermissions()
  return (
    <div>
      <PageHeader title="Tambah Role" />
      <RoleForm permissions={permissions} />
    </div>
  )
}
