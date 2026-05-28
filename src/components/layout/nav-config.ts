import {
  LayoutDashboard,
  Package,
  Tags,
  BadgeCheck,
  Ruler,
  Truck,
  UserCircle,
  Warehouse as WarehouseIcon,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ClipboardCheck,
  ShoppingCart,
  FileText,
  Calculator,
  Receipt,
  Users,
  Shield,
  Store,
  ScrollText,
  type LucideIcon
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon?: LucideIcon
  permission?: string | string[]
  milestone?: "M1" | "M2" | "M3"
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }]
  },
  {
    label: "Master Data",
    items: [
      { label: "Produk", href: "/master/products", icon: Package, permission: "product.read" },
      { label: "Kategori", href: "/master/categories", icon: Tags, permission: "category.read" },
      { label: "Brand", href: "/master/brands", icon: BadgeCheck, permission: "brand.read" },
      { label: "Satuan", href: "/master/units", icon: Ruler, permission: "unit.read" },
      { label: "Supplier", href: "/master/suppliers", icon: Truck, permission: "supplier.read" },
      { label: "Customer", href: "/master/customers", icon: UserCircle, permission: "customer.read" },
      { label: "Gudang", href: "/master/warehouses", icon: WarehouseIcon, permission: "warehouse.read" }
    ]
  },
  {
    label: "Inventaris",
    items: [
      { label: "Saldo Stok", href: "/inventory/stock", icon: Boxes, permission: "inventory.read" },
      {
        label: "Penyesuaian Stok",
        href: "/inventory/adjustments",
        icon: ClipboardList,
        permission: "inventory.adjustment.create"
      },
      {
        label: "Mutasi Antar Gudang",
        href: "/inventory/transfers",
        icon: ArrowLeftRight,
        permission: "inventory.transfer.create"
      },
      {
        label: "Stok Opname",
        href: "/inventory/opname",
        icon: ClipboardCheck,
        permission: "inventory.opname.run"
      }
    ]
  },
  {
    label: "Pembelian",
    items: [
      {
        label: "Purchase Order",
        href: "/purchase/orders",
        icon: ShoppingCart,
        permission: "purchase.po.read"
      },
      {
        label: "Faktur Pembelian",
        href: "/purchase/invoices",
        icon: FileText,
        permission: "purchase.invoice.read"
      }
    ]
  },
  {
    label: "Penjualan",
    items: [
      { label: "Kasir / POS", href: "/sale/pos", icon: Calculator, permission: "sale.write" },
      { label: "Faktur Penjualan", href: "/sale/invoices", icon: Receipt, permission: "sale.read" }
    ]
  },
  {
    label: "Pengaturan",
    items: [
      { label: "Pengguna", href: "/settings/users", icon: Users, permission: "user.read" },
      { label: "Role", href: "/settings/roles", icon: Shield, permission: "role.write" },
      { label: "Profil Toko", href: "/settings/store", icon: Store, permission: "setting.write" },
      { label: "Activity Log", href: "/settings/audit-log", icon: ScrollText, permission: "audit.read" },
      { label: "Profil Saya", href: "/settings/profile", icon: UserCircle }
    ]
  }
]

export function filterNavByPermissions(groups: NavGroup[], permissionKeys: string[]): NavGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (!it.permission) return true
        const required = Array.isArray(it.permission) ? it.permission : [it.permission]
        return required.every((k) => permissionKeys.includes(k))
      })
    }))
    .filter((g) => g.items.length > 0)
}
