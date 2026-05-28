import { prisma } from "@/lib/db"

export async function listRoles() {
  const roles = await prisma.role.findMany({
    include: {
      _count: { select: { users: true, permissions: true } }
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }]
  })
  return roles
}

export async function getRoleWithPermissions(id: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    include: { permissions: { include: { permission: true } } }
  })
  if (!role) return null
  return {
    ...role,
    permissionKeys: role.permissions.map((rp) => rp.permission.key)
  }
}

export async function listAllPermissions() {
  return prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { key: "asc" }]
  })
}
