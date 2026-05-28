import { prisma } from "@/lib/db"

export interface UserListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listUsers({ q, page = 1, pageSize = 25 }: UserListParams) {
  const where = {
    deletedAt: null,
    NOT: { username: "system" },
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        roles: { include: { role: { select: { id: true, name: true } } } },
        defaultWarehouse: { select: { id: true, name: true } }
      },
      orderBy: { username: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.user.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      warehouseAccess: { include: { warehouse: true } }
    }
  })
}

export async function listAllRolesForSelect() {
  return prisma.role.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" }
  })
}

export async function listAllWarehousesForSelect() {
  return prisma.warehouse.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  })
}
