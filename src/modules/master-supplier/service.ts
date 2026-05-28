import type { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "@/lib/errors"
import { generateMasterCode } from "@/lib/id"
import type { CreateSupplierInput, UpdateSupplierInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

async function nextSupplierCode(db: Db): Promise<string> {
  const result = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" (key, value) VALUES ('SUPPLIER', 1)
    ON CONFLICT (key) DO UPDATE SET value = "Counter".value + 1
    RETURNING value
  `
  const seq = result[0]?.value ?? 1
  return generateMasterCode("SUP", seq)
}

export async function createSupplier(db: Db, input: CreateSupplierInput) {
  const code = await nextSupplierCode(db)
  return db.supplier.create({
    data: {
      code,
      name: input.name,
      phone: input.phone ?? null,
      address: input.address ?? null,
      npwp: input.npwp ?? null,
      termOfPaymentDays: input.termOfPaymentDays
    }
  })
}

export async function updateSupplier(db: Db, input: UpdateSupplierInput) {
  const current = await db.supplier.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Supplier tidak ditemukan")
  return db.supplier.update({
    where: { id: input.id },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      address: input.address ?? null,
      npwp: input.npwp ?? null,
      termOfPaymentDays: input.termOfPaymentDays
    }
  })
}

export async function softDeleteSupplier(db: Db, id: string) {
  const current = await db.supplier.findUnique({ where: { id } })
  if (!current) throw new AppError("NOT_FOUND", "Supplier tidak ditemukan")
  // M2 will add guards for active POs / invoices / payables.
  return db.supplier.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}
