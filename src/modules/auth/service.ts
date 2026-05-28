import { auth } from "@/lib/auth"
import { AppError } from "@/lib/errors"

export async function requireSession() {
  const session = await auth()
  if (!session?.user) throw new AppError("FORBIDDEN", "Belum login")
  return session
}

export async function requirePermission(key: string | string[]) {
  const session = await requireSession()
  const required = Array.isArray(key) ? key : [key]
  const has = required.every((k) => session.user.permissionKeys.includes(k))
  if (!has) throw new AppError("FORBIDDEN", "Tidak punya izin untuk aksi ini")
  return session
}

export function hasPermission(permissionKeys: string[], key: string): boolean {
  return permissionKeys.includes(key)
}
