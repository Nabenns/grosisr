"use client"

import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export function UserMenu({ name, username }: { name: string; username: string }) {
  const router = useRouter()
  const initial = (name || username || "?").charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm max-w-24 truncate">{name || username}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium">{name || username}</div>
          <div className="text-xs text-muted-foreground">@{username}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings/profile" as never)} className="gap-2">
          <User className="h-3.5 w-3.5" />
          Profil Saya
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings/general" as never)} className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          Pengaturan Toko
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          variant="destructive"
          className="gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
