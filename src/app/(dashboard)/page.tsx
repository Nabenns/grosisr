import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()
  return (
    <div>
      <h1 className="text-2xl font-bold">Selamat datang, {session?.user.name}</h1>
      <p className="text-sm text-muted-foreground mt-1">Sistem Manajemen Grosir.</p>
    </div>
  )
}
