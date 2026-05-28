import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe NextAuth config consumed by middleware.
 * Excludes `providers` array (Credentials provider uses bcryptjs which is not edge-runtime safe).
 * The full config (with providers) lives in `./auth.ts` and is used by the API route handler.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      // Middleware uses this only as a quick "is logged in" gate; the actual
      // route protection logic lives in src/middleware.ts.
      return !!auth?.user
    }
  }
} satisfies NextAuthConfig
