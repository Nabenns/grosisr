import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = { title: "Grosir", description: "Sistem Manajemen Grosir" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
