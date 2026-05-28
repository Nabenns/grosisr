import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Sistem Manajemen Grosir</h1>
        <p className="text-sm text-muted-foreground">Masuk untuk lanjut</p>
      </div>
      <LoginForm />
    </div>
  )
}
