import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Menambahkan data demo master...")

  // Units
  const units = await Promise.all([
    prisma.unit.upsert({ where: { name: "PCS" }, create: { name: "PCS" }, update: {} }),
    prisma.unit.upsert({ where: { name: "DUS" }, create: { name: "DUS" }, update: {} }),
    prisma.unit.upsert({ where: { name: "PACK" }, create: { name: "PACK" }, update: {} }),
    prisma.unit.upsert({ where: { name: "RENCENG" }, create: { name: "RENCENG" }, update: {} }),
    prisma.unit.upsert({ where: { name: "SLOP" }, create: { name: "SLOP" }, update: {} })
  ])
  const pcs = units[0]
  const dus = units[1]
  const pack = units[2]

  // Categories
  const ensureCategory = async (name: string) => {
    const found = await prisma.category.findFirst({ where: { name } })
    if (found) return found
    return prisma.category.create({ data: { name } })
  }
  const sembako = await ensureCategory("Sembako")
  const minuman = await ensureCategory("Minuman")
  const rokok = await ensureCategory("Rokok")
  const snack = await ensureCategory("Makanan Ringan")

  // Brands
  const indofood = await prisma.brand.upsert({ where: { name: "Indofood" }, create: { name: "Indofood" }, update: {} })
  const wings = await prisma.brand.upsert({ where: { name: "Wings" }, create: { name: "Wings" }, update: {} })
  const sampoerna = await prisma.brand.upsert({ where: { name: "Sampoerna" }, create: { name: "Sampoerna" }, update: {} })
  const mayora = await prisma.brand.upsert({ where: { name: "Mayora" }, create: { name: "Mayora" }, update: {} })

  // Default warehouse
  const wh = await prisma.warehouse.findFirst({ where: { code: "WH-MAIN" } })

  const demoProducts = [
    {
      sku: "IDM-GORENG",
      name: "Indomie Goreng Spesial 85g",
      categoryId: sembako.id,
      brandId: indofood.id,
      baseUnitId: pcs.id,
      minStock: 50,
      units: [
        { unitId: pcs.id, conversionToBase: 1, purchasePrice: 2800, salePrice: 3100, isDefaultSale: true, barcode: "899886620021" },
        { unitId: dus.id, conversionToBase: 40, purchasePrice: 110000, salePrice: 118000, isDefaultPurchase: true, barcode: "899886620040" }
      ],
      stockQty: 240
    },
    {
      sku: "IDM-AYAM-BWG",
      name: "Indomie Kuah Ayam Bawang 69g",
      categoryId: sembako.id,
      brandId: indofood.id,
      baseUnitId: pcs.id,
      minStock: 40,
      units: [
        { unitId: pcs.id, conversionToBase: 1, purchasePrice: 2700, salePrice: 3000, isDefaultSale: true, barcode: "899886620022" },
        { unitId: dus.id, conversionToBase: 40, purchasePrice: 106000, salePrice: 115000, isDefaultPurchase: true }
      ],
      stockQty: 80
    },
    {
      sku: "MIE-SEDAP-GRG",
      name: "Mie Sedaap Goreng 90g",
      categoryId: sembako.id,
      brandId: wings.id,
      baseUnitId: pcs.id,
      minStock: 50,
      units: [
        { unitId: pcs.id, conversionToBase: 1, purchasePrice: 2750, salePrice: 3100, isDefaultSale: true, barcode: "899100110010" },
        { unitId: dus.id, conversionToBase: 40, purchasePrice: 108000, salePrice: 117000, isDefaultPurchase: true }
      ],
      stockQty: 15 // low stock!
    },
    {
      sku: "LE-MINERALE-600",
      name: "Le Minerale 600ml",
      categoryId: minuman.id,
      brandId: mayora.id,
      baseUnitId: pcs.id,
      minStock: 48,
      units: [
        { unitId: pcs.id, conversionToBase: 1, purchasePrice: 2800, salePrice: 3500, isDefaultSale: true, barcode: "899600130001" },
        { unitId: dus.id, conversionToBase: 24, purchasePrice: 62000, salePrice: 72000, isDefaultPurchase: true }
      ],
      stockQty: 120
    },
    {
      sku: "TEH-PUCUK-350",
      name: "Teh Pucuk Harum 350ml",
      categoryId: minuman.id,
      brandId: mayora.id,
      baseUnitId: pcs.id,
      minStock: 48,
      units: [
        { unitId: pcs.id, conversionToBase: 1, purchasePrice: 3100, salePrice: 4000, isDefaultSale: true, barcode: "899600130002" },
        { unitId: dus.id, conversionToBase: 24, purchasePrice: 70000, salePrice: 82000, isDefaultPurchase: true }
      ],
      stockQty: 8 // low stock!
    },
    {
      sku: "SAM-MILD-16",
      name: "Sampoerna A Mild 16",
      categoryId: rokok.id,
      brandId: sampoerna.id,
      baseUnitId: pack.id,
      minStock: 20,
      hasCukai: true,
      hasHet: true,
      hetPrice: 36000,
      units: [
        { unitId: pack.id, conversionToBase: 1, purchasePrice: 31500, salePrice: 34500, isDefaultSale: true, barcode: "899298810001" }
      ],
      stockQty: 45
    },
    {
      sku: "BENG-BENG-SHARE",
      name: "Beng Beng Share It 10x9.5g",
      categoryId: snack.id,
      brandId: mayora.id,
      baseUnitId: pack.id,
      minStock: 24,
      units: [
        { unitId: pack.id, conversionToBase: 1, purchasePrice: 11000, salePrice: 13500, isDefaultSale: true, barcode: "899600140001" }
      ],
      stockQty: 60
    }
  ]

  for (const p of demoProducts) {
    const created = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        brandId: p.brandId,
        baseUnitId: p.baseUnitId,
        minStock: p.minStock,
        hasCukai: p.hasCukai ?? false,
        hasHet: p.hasHet ?? false,
        hetPrice: p.hetPrice ?? null,
        isActive: true,
        units: {
          create: p.units
        }
      },
      update: {
        name: p.name,
        minStock: p.minStock
      }
    })

    if (wh) {
      await prisma.stockBalance.upsert({
        where: { productId_warehouseId: { productId: created.id, warehouseId: wh.id } },
        create: {
          productId: created.id,
          warehouseId: wh.id,
          qtyInBase: p.stockQty
        },
        update: {
          qtyInBase: p.stockQty
        }
      })
    }
  }

  // Tambah beberapa customer demo
  await prisma.customer.upsert({
    where: { code: "CUST-001" },
    create: {
      code: "CUST-001",
      name: "Toko Berkah Jaya",
      customerType: "RESELLER",
      phone: "081234567890",
      address: "Jl. Pasar Lama No. 12",
      creditLimit: 5000000,
      termOfPaymentDays: 14
    },
    update: {}
  })

  await prisma.customer.upsert({
    where: { code: "CUST-002" },
    create: {
      code: "CUST-002",
      name: "Warung Bu Siti",
      customerType: "RETAIL",
      phone: "089876543210",
      address: "Gg. Makmur RT 02/05"
    },
    update: {}
  })

  console.log("Demo seed selesai! Total produk:", demoProducts.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
