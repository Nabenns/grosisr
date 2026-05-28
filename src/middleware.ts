// Edge-safe middleware: uses NextAuth `auth.config.ts` (no Prisma/bcrypt) so the
// middleware bundle stays small enough for Vercel/Cloudflare Edge runtime.
// The full Credentials provider lives in `@/lib/auth.ts`, used only by the API route.

import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLogged = !!req.auth
  const path = req.nextUrl.pathname
  const isLoginPage = path.startsWith("/login")
  const isApiAuth = path.startsWith("/api/auth")

  if (isApiAuth) return NextResponse.next()
  if (!isLogged && !isLoginPage) {
    const url = new URL("/login", req.url)
    url.searchParams.set("from", path)
    return NextResponse.redirect(url)
  }
  if (isLogged && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"]
}
