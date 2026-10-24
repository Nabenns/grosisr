import { prisma } from "@/lib/db"

export type ProfitLossDaily = {
  day: string
  revenue: number
  cogs: number
  profit: number
}

export type ProfitLossTopProduct = {
  sku: string
  name: string
  qty: number
  revenue: number
  profit: number
}

export type ProfitLossSummary = {
  revenue: number
  cogs: number
  profit: number
  margin: number
  invoiceCount: number
  itemCount: number
  avgPerInvoice: number
}

export type ProfitLossReport = {
  summary: ProfitLossSummary
  daily: ProfitLossDaily[]
  topProducts: ProfitLossTopProduct[]
  from: Date
  to: Date
}

/**
 * HPP is estimated from each product unit's recorded purchase price. We do not
 * keep a per-sale cost snapshot yet, so re-pricing a product changes historic
 * HPP — the UI labels the figure as an estimate for that reason.
 */
export async function getProfitLossReport(params: {
  dateFrom: Date
  dateTo: Date
}): Promise<ProfitLossReport> {
  const { dateFrom, dateTo } = params

  const daily = await prisma.$queryRaw<
    { day: Date; revenue: string; cogs: string; invoice_count: bigint }[]
  >`
    SELECT date_trunc('day', si."invoiceDate") AS day,
           COALESCE(SUM(si."total"), 0)::text AS revenue,
           COALESCE(SUM(sii."qty" * pu."purchasePrice"), 0)::text AS cogs,
           COUNT(DISTINCT si.id) AS invoice_count
    FROM "SaleInvoice" si
    JOIN "SaleInvoiceItem" sii ON sii."invoiceId" = si.id
    JOIN "ProductUnit" pu ON pu.id = sii."productUnitId"
    WHERE si."status" <> 'VOID'
      AND si."invoiceDate" >= ${dateFrom}
      AND si."invoiceDate" <= ${dateTo}
    GROUP BY 1
    ORDER BY 1
  `

  const items = await prisma.$queryRaw<
    { sku: string; name: string; qty: string; revenue: string; cogs: string }[]
  >`
    SELECT p."sku" AS sku,
           p."name" AS name,
           COALESCE(SUM(sii."qty"), 0)::text AS qty,
           COALESCE(SUM(sii."subtotal"), 0)::text AS revenue,
           COALESCE(SUM(sii."qty" * pu."purchasePrice"), 0)::text AS cogs
    FROM "SaleInvoiceItem" sii
    JOIN "SaleInvoice" si ON si.id = sii."invoiceId"
    JOIN "ProductUnit" pu ON pu.id = sii."productUnitId"
    JOIN "Product" p ON p.id = pu."productId"
    WHERE si."status" <> 'VOID'
      AND si."invoiceDate" >= ${dateFrom}
      AND si."invoiceDate" <= ${dateTo}
    GROUP BY p."sku", p."name"
    ORDER BY 4 DESC
    LIMIT 10
  `

  // Zero-fill every day in the range so the chart draws a continuous line
  // (a single data point renders as nothing) and quiet days are visible.
  const byDay = new Map(
    daily.map((row) => {
      const revenue = Number(row.revenue)
      const cogs = Number(row.cogs)
      return [row.day.toISOString().slice(0, 10), { revenue, cogs }] as const
    })
  )
  const series: ProfitLossDaily[] = []
  const cursor = new Date(dateFrom)
  cursor.setHours(0, 0, 0, 0)
  const lastDay = new Date(dateTo)
  lastDay.setHours(0, 0, 0, 0)
  while (cursor <= lastDay && series.length < 180) {
    const key = cursor.toISOString().slice(0, 10)
    const hit = byDay.get(key)
    const revenue = hit?.revenue ?? 0
    const cogs = hit?.cogs ?? 0
    series.push({ day: key, revenue, cogs, profit: revenue - cogs })
    cursor.setDate(cursor.getDate() + 1)
  }

  const revenue = series.reduce((acc, row) => acc + row.revenue, 0)
  const cogs = series.reduce((acc, row) => acc + row.cogs, 0)
  const invoiceCount = daily.reduce((acc, row) => acc + Number(row.invoice_count), 0)

  const topProducts: ProfitLossTopProduct[] = items.map((row) => {
    const itemRevenue = Number(row.revenue)
    const itemCogs = Number(row.cogs)
    return {
      sku: row.sku,
      name: row.name,
      qty: Number(row.qty),
      revenue: itemRevenue,
      profit: itemRevenue - itemCogs
    }
  })

  return {
    summary: {
      revenue,
      cogs,
      profit: revenue - cogs,
      margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
      invoiceCount,
      itemCount: topProducts.reduce((acc, row) => acc + row.qty, 0),
      avgPerInvoice: invoiceCount > 0 ? revenue / invoiceCount : 0
    },
    daily: series,
    topProducts,
    from: dateFrom,
    to: dateTo
  }
}
