import type { Prisma, PrismaClient } from "@prisma/client"
import Decimal from "decimal.js"
import { AppError } from "@/lib/errors"
import { generateMasterCode } from "@/lib/id"
import type { CreateCustomerInput, UpdateCustomerInput } from "./schema"

type Db = PrismaClient | Prisma.TransactionClient

async function nextCustomerCode(db: Db): Promise<string> {
  const result = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" (key, value) VALUES ('CUSTOMER', 1)
    ON CONFLICT (key) DO UPDATE SET value = "Counter".value + 1
    RETURNING value
  `
  return generateMasterCode("CUS", result[0]?.value ?? 1)
}

export async function createCustomer(db: Db, input: CreateCustomerInput) {
  const code = await nextCustomerCode(db)
  return db.customer.create({
    data: {
      code,
      name: input.name,
      phone: input.phone ?? null,
      address: input.address ?? null,
      customerType: input.customerType,
      creditLimit: new Decimal(input.creditLimit),
      termOfPaymentDays: input.termOfPaymentDays
    }
  })
}

export async function updateCustomer(db: Db, input: UpdateCustomerInput) {
  const current = await db.customer.findUnique({ where: { id: input.id } })
  if (!current || current.deletedAt) throw new AppError("NOT_FOUND", "Customer tidak ditemukan")
  return db.customer.update({
    where: { id: input.id },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      address: input.address ?? null,
      customerType: input.customerType,
      creditLimit: new Decimal(input.creditLimit),
      termOfPaymentDays: input.termOfPaymentDays
    }
  })
}

export async function softDeleteCustomer(db: Db, id: string) {
  const current = await db.customer.findUnique({ where: { id } })
  if (!current) throw new AppError("NOT_FOUND", "Customer tidak ditemukan")
  // M3 will add piutang outstanding guard.
  return db.customer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  })
}
