// TODO(M1 polish / Task 32): split into auth.config.ts (edge-safe) for middleware to keep bcryptjs out of the edge bundle.
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLogged = !!req.auth
  const isLoginPage = req.nextUrl.pathname.startsWith("/login")
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  if (isApiAuth) return NextResponse.next()
  if (!isLogged && !isLoginPage) {
    const url = new URL("/login", req.url)
    url.searchParams.set("from", req.nextUrl.pathname)
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
