"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { NAV_GROUPS, filterNavByPermissions } from "./nav-config"

export function Sidebar({ permissionKeys }: { permissionKeys: string[] }) {
  const pathname = usePathname()
  const groups = filterNavByPermissions(NAV_GROUPS, permissionKeys)

  return (
    <aside className="w-60 border-r bg-card h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b">
        <Link href="/" className="font-bold text-lg">
          Grosir
        </Link>
      </div>
      <nav className="p-2 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && (
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {g.label}
              </div>
            )}
            <div className="space-y-1">
              {g.items.map((it) => {
                const Icon = it.icon
                const isActive =
                  pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href))
                return (
                  <Link
                    key={it.href}
                    href={it.href as never}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-accent/50"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {it.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
