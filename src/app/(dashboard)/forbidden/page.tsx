import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Lock className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Akses ditolak</h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        Kamu tidak punya izin untuk halaman ini. Hubungi admin kalau perlu akses.
      </p>
      <Link href="/" className="mt-4">
        <Button>Kembali ke Beranda</Button>
      </Link>
    </div>
  )
}
