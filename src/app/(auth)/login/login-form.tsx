"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function LoginFormInner() {
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "/"
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      username: fd.get("username"),
      password: fd.get("password"),
      redirect: false
    })
    setLoading(false)
    if (result?.error) {
      setError("Username atau password salah")
      return
    }
    window.location.assign(from)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          required
          autoFocus
          autoComplete="username"
          placeholder="admin / kasir"
          className="h-10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-10"
        />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" className="h-10 w-full font-medium" disabled={loading}>
        {loading ? "Memproses..." : "Masuk ke Sistem"}
      </Button>
    </form>
  )
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 text-xs text-muted-foreground">
          Memuat formulir masuk...
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  )
}
