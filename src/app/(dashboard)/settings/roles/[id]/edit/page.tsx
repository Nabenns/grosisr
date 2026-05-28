import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getRoleWithPermissions, listAllPermissions } from "@/modules/settings-role/queries"
import { RoleForm } from "@/modules/settings-role/components/role-form"
import { PageHeader } from "@/components/page-header"

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("role.write")) redirect("/forbidden")
  const { id } = await params
  const [role, permissions] = await Promise.all([getRoleWithPermissions(id), listAllPermissions()])
  if (!role) notFound()
  return (
    <div>
      <PageHeader title={`Ubah Role: ${role.name}`} />
      <RoleForm
        permissions={permissions}
        initial={{
          id: role.id,
          name: role.name,
          description: role.description,
          permissionKeys: role.permissionKeys,
          isSystem: role.isSystem
        }}
      />
    </div>
  )
}
