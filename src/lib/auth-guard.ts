import { redirect } from "next/navigation"
import { auth } from "./auth"

/**
 * Page-level guard. Use in server components/pages to enforce authentication
 * AND a specific permission (or set of permissions). On failure, redirects
 * to /login (no session) or /forbidden (session but missing permission).
 *
 * Usage:
 *   const session = await requirePagePermission("product.read")
 *   const session = await requirePagePermission(["product.write", "product.delete"])
 */
export async function requirePagePermission(key: string | string[]) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const required = Array.isArray(key) ? key : [key]
  const has = required.every((k) => session.user.permissionKeys.includes(k))
  if (!has) redirect("/forbidden")
  return session
}

/**
 * Page-level guard for routes that require authentication but no specific
 * permission (e.g. /settings/profile).
 */
export async function requirePageAuth() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session
}
