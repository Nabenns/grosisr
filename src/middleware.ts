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
    // Relative redirect keeps the host the visitor actually used
    // (behind a tunnel/reverse-proxy `req.url` can be `http://localhost:3001`).
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(path)}`, req.nextUrl.origin)
    )
  }
  if (isLogged && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"]
}
