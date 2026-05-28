export const PERMISSION_MODULES = {
  category: ["read", "write"],
  brand: ["read", "write"],
  unit: ["read", "write"],
  product: ["read", "write", "delete", "import"],
  supplier: ["read", "write"],
  customer: ["read", "write"],
  warehouse: ["read", "write"],
  inventory: [
    "read",
    "adjustment.create",
    "adjustment.post",
    "transfer.create",
    "transfer.send",
    "transfer.receive",
    "opname.run"
  ],
  purchase: [
    "po.read",
    "po.write",
    "invoice.read",
    "invoice.write",
    "invoice.post",
    "invoice.void",
    "return.write"
  ],
  sale: [
    "read",
    "write",
    "post",
    "discount.apply",
    "discount.high",
    "void",
    "return.write",
    "credit.override_limit",
    "het_override"
  ],
  finance: ["payable.read", "payable.pay", "receivable.read", "receivable.collect"],
  report: ["stock", "sale", "purchase", "finance"],
  user: ["read", "write"],
  role: ["write"],
  setting: ["write"],
  audit: ["read"]
} as const

export type PermissionKey = string

export function allPermissions(): { key: string; module: string; description: string }[] {
  const result: { key: string; module: string; description: string }[] = []
  for (const [module, actions] of Object.entries(PERMISSION_MODULES)) {
    for (const action of actions) {
      const key = `${module}.${action}`
      result.push({ key, module, description: `Permission ${key}` })
    }
  }
  return result
}

export const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  OWNER: "*",
  ADMIN: [
    "category.*",
    "brand.*",
    "unit.*",
    "product.*",
    "supplier.*",
    "customer.*",
    "warehouse.read",
    "inventory.*",
    "purchase.*",
    "sale.*",
    "finance.*",
    "report.*",
    "audit.read"
  ],
  KASIR: [
    "product.read",
    "customer.read",
    "customer.write",
    "sale.read",
    "sale.write",
    "sale.post",
    "sale.discount.apply",
    "inventory.read"
  ],
  GUDANG: [
    "product.read",
    "supplier.read",
    "warehouse.read",
    "inventory.*",
    "purchase.invoice.read",
    "purchase.invoice.write",
    "purchase.invoice.post",
    "purchase.return.write"
  ],
  VIEWER: ["*.read"]
}

export function expandRolePatterns(patterns: string[] | "*", allKeys: string[]): string[] {
  if (patterns === "*") return allKeys
  const result = new Set<string>()
  for (const p of patterns) {
    if (p === "*") {
      allKeys.forEach((k) => result.add(k))
    } else if (p.endsWith(".*")) {
      const prefix = p.slice(0, -2)
      allKeys
        .filter((k) => k === prefix || k.startsWith(`${prefix}.`))
        .forEach((k) => result.add(k))
    } else if (p.startsWith("*.")) {
      const suffix = p.slice(2)
      allKeys.filter((k) => k.endsWith(`.${suffix}`)).forEach((k) => result.add(k))
    } else {
      result.add(p)
    }
  }
  return [...result]
}
