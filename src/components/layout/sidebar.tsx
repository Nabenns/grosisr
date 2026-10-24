"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NAV_GROUPS, filterNavByPermissions } from "./nav-config"

export function Sidebar({ permissionKeys }: { permissionKeys: string[] }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem("grosir.sidebarCollapsed") === "1")
  }, [])

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("grosir.sidebarCollapsed", c ? "0" : "1")
      return !c
    })
  }

  const groups = filterNavByPermissions(NAV_GROUPS, permissionKeys)

  return (
    <aside
      className={cn(
        "border-r bg-sidebar h-screen sticky top-0 flex flex-col overflow-y-auto transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="p-3 border-b flex items-center justify-between gap-2 h-14">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-accent transition-colors overflow-hidden",
            collapsed && "justify-center w-full"
          )}
        >
          <span className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
            GR
          </span>
          {!collapsed && <span className="font-bold text-sm whitespace-nowrap">Grosir</span>}
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && !collapsed && (
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                {g.label}
              </div>
            )}
            <div className="space-y-0.5 mt-1">
              {g.items.map((it) => {
                const Icon = it.icon
                const isActive =
                  it.href === "/"
                    ? pathname === "/"
                    : pathname === it.href || pathname.startsWith(it.href + "/")
                return (
                  <Link
                    key={it.href}
                    href={it.href as never}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2 border-t flex items-center" style={{ height: "auto" }}>
        {collapsed ? (
          <Button variant="ghost" size="icon" onClick={toggle} title="Besarkan sidebar" className="mx-auto">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <span className="px-2 text-[10px] text-muted-foreground">v0.1.0 · M1</span>
            <Button variant="ghost" size="icon" onClick={toggle} title="Kecilkan sidebar" className="ml-auto">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </aside>
  )
}
