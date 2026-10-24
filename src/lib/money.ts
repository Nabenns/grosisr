import Decimal from "decimal.js"

export function toDecimal(v: number | string | Decimal): Decimal {
  return new Decimal(v)
}

export function formatIDR(v: number | string | Decimal): string {
  const d = toDecimal(v)
  const fixed = d.toFixed(0)
  const negative = fixed.startsWith("-")
  const abs = negative ? fixed.slice(1) : fixed
  const withDots = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `Rp ${negative ? "-" : ""}${withDots}`
}

/** Compact IDR for chart axes: 1.2 jt / 850 rb / 12,5 M. */
export function formatIDRCompact(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? "-" : ""
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1_000)} rb`
  // Keep exact values below 10k so chart ticks never collide (1000 vs 1500
  // both used to round to "2 rb").
  return `${sign}${Math.round(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}
