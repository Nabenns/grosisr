import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground mt-2">URL yang kamu buka tidak ada.</p>
      <Link href="/" className="mt-4">
        <Button>Beranda</Button>
      </Link>
    </div>
  )
}
