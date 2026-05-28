import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { allPermissions } from "./permissions"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      name: string
      email?: string
      defaultWarehouseId: string | null
      roleNames: string[]
      permissionKeys: string[]
      warehouseIds: string[]
    }
  }
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials) => {
        const username = credentials?.username as string
        const password = credentials?.password as string
        if (!username || !password) return null
        const user = await prisma.user.findFirst({
          where: { username, isActive: true, deletedAt: null },
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
            warehouseAccess: true
          }
        })
        if (!user) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        const roleNames = user.roles.map((r) => r.role.name)
        const allKeys = allPermissions().map((p) => p.key)
        const permsSet = new Set<string>()
        for (const ur of user.roles) {
          if (ur.role.name === "OWNER") {
            allKeys.forEach((k) => permsSet.add(k))
            continue
          }
          ur.role.permissions.forEach((rp) => permsSet.add(rp.permission.key))
        }
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email ?? undefined,
          defaultWarehouseId: user.defaultWarehouseId,
          roleNames,
          permissionKeys: [...permsSet],
          warehouseIds: user.warehouseAccess.map((w) => w.warehouseId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any
        token.id = u.id
        token.username = u.username
        token.name = u.name
        token.defaultWarehouseId = u.defaultWarehouseId
        token.roleNames = u.roleNames
        token.permissionKeys = u.permissionKeys
        token.warehouseIds = u.warehouseIds
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.name = (token.name as string) ?? session.user.name
      session.user.defaultWarehouseId = (token.defaultWarehouseId as string | null) ?? null
      session.user.roleNames = (token.roleNames as string[]) ?? []
      session.user.permissionKeys = (token.permissionKeys as string[]) ?? []
      session.user.warehouseIds = (token.warehouseIds as string[]) ?? []
      return session
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
