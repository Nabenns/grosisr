import { prisma } from "@/lib/db"

export interface CustomerListParams {
  q?: string
  page?: number
  pageSize?: number
}

export async function listCustomers({ q, page = 1, pageSize = 25 }: CustomerListParams) {
  const where = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  }
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.customer.count({ where })
  ])
  return { items, total, page, pageSize }
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } })
}
