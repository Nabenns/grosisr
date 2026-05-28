"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-2xl font-bold">Terjadi kesalahan</h1>
      <p className="text-sm text-muted-foreground mt-2">Tim sudah dinotifikasi. Coba lagi atau kembali nanti.</p>
      <Button onClick={reset} className="mt-4">
        Coba Lagi
      </Button>
    </div>
  )
}
