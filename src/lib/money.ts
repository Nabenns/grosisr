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
