import { PrismaClient, type Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "node:crypto"
import { allPermissions, ROLE_PERMISSIONS, expandRolePatterns } from "../src/lib/permissions"

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seed script must not run in production. Set NODE_ENV != 'production' or run manually with explicit confirmation."
    )
  }

  // 1. Permissions
  console.log("Seeding permissions...")
  const permissions = allPermissions()
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, module: p.module, description: p.description },
      update: { module: p.module, description: p.description }
    })
  }

  const allKeys = permissions.map((p) => p.key)
  const permissionsByKey = new Map(
    (await prisma.permission.findMany({ select: { id: true, key: true } })).map((p) => [
      p.key,
      p.id
    ])
  )

  // 2. Roles + role-permission assignments
  console.log("Seeding roles...")
  const roleSpecs: { name: string; description: string; isSystem: boolean }[] = [
    { name: "OWNER", description: "Pemilik usaha — akses penuh", isSystem: true },
    { name: "ADMIN", description: "Administrator operasional", isSystem: true },
    { name: "KASIR", description: "Kasir / front-office", isSystem: true },
    { name: "GUDANG", description: "Staf gudang / inventory", isSystem: true },
    { name: "VIEWER", description: "Read-only", isSystem: true }
  ]

  for (const spec of roleSpecs) {
    const role = await prisma.role.upsert({
      where: { name: spec.name },
      create: spec,
      update: { description: spec.description, isSystem: spec.isSystem }
    })

    const patterns = ROLE_PERMISSIONS[spec.name]
    if (!patterns) continue
    const expandedKeys = expandRolePatterns(patterns, allKeys)
    const missing = expandedKeys.filter((k) => !permissionsByKey.has(k))
    if (missing.length > 0) {
      throw new Error(
        `Role ${spec.name} references unknown permissions: ${missing.join(", ")}`
      )
    }
    const permissionIds = expandedKeys.map((k) => permissionsByKey.get(k)!)

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    ]
    if (permissionIds.length > 0) {
      ops.push(
        prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true
        })
      )
    }
    await prisma.$transaction(ops)
  }

  // 3. Default warehouse
  console.log("Seeding default warehouse...")
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    create: {
      code: "WH-MAIN",
      name: "Gudang Utama",
      isActive: true,
      isDefault: true
    },
    update: { name: "Gudang Utama", isActive: true, isDefault: true }
  })

  // 4. Owner user
  console.log("Seeding owner user...")
  const ownerPasswordHash = await bcrypt.hash("changeme123", 12)
  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: "OWNER" } })
  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    create: {
      username: "owner",
      email: "owner@grosir.local",
      name: "Owner",
      passwordHash: ownerPasswordHash,
      isActive: true,
      defaultWarehouseId: warehouse.id
    },
    update: {
      email: "owner@grosir.local",
      name: "Owner",
      isActive: true,
      defaultWarehouseId: warehouse.id
    }
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: owner.id, roleId: ownerRole.id } },
    create: { userId: owner.id, roleId: ownerRole.id },
    update: {}
  })

  await prisma.userWarehouse.upsert({
    where: { userId_warehouseId: { userId: owner.id, warehouseId: warehouse.id } },
    create: { userId: owner.id, warehouseId: warehouse.id },
    update: {}
  })

  // 5. System user (for audit log on system-initiated mutations)
  console.log("Seeding system user...")
  await prisma.user.upsert({
    where: { username: "system" },
    create: {
      id: "system",
      username: "system",
      name: "System",
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
      isActive: false
    },
    update: {}
  })

  // 6. Common units
  console.log("Seeding common units...")
  const commonUnits = ["pcs", "pak", "slop", "dus", "bal", "karton", "batang", "kg", "gram", "liter"]
  for (const name of commonUnits) {
    await prisma.unit.upsert({ where: { name }, create: { name }, update: {} })
  }

  // 7. Walk-in customer + counter init
  console.log("Seeding walk-in customer...")
  await prisma.counter.upsert({
    where: { key: "CUSTOMER" },
    create: { key: "CUSTOMER", value: 0 },
    update: {}
  })
  await prisma.counter.upsert({
    where: { key: "SUPPLIER" },
    create: { key: "SUPPLIER", value: 0 },
    update: {}
  })
  await prisma.customer.upsert({
    where: { code: "CUS-WALKIN" },
    create: {
      code: "CUS-WALKIN",
      name: "Walk-in",
      customerType: "RETAIL",
      creditLimit: 0,
      termOfPaymentDays: 0
    },
    update: {}
  })

  // 8. Default settings
  console.log("Seeding default settings...")
  const defaultSettings: { key: string; value: string }[] = [
    { key: "allow_negative_stock", value: "false" },
    { key: "store_name", value: "Grosir Toko" },
    { key: "store_address", value: "" },
    { key: "store_phone", value: "" }
  ]
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: {} // don't overwrite if owner edited
    })
  }

  console.log("Seed complete. Owner login: owner / changeme123")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
