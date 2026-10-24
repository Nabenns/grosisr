import { LoginForm } from "./login-form"
import { Box, Shield, Truck, Users } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Box className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Sistem Manajemen Grosir</h1>
        </div>
        <p className="text-sm text-muted-foreground">Masuk untuk melanjutkan</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg border bg-secondary/50">
          <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">Customer</div>
        </div>
        <div className="p-2 rounded-lg border bg-secondary/50">
          <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">Supplier</div>
        </div>
        <div className="p-2 rounded-lg border bg-secondary/50">
          <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">RBAC + Audit</div>
        </div>
      </div>
      <LoginForm />
    </div>
  )
}
