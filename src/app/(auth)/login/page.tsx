import { LoginForm } from "./login-form"
import { Boxes, ShieldCheck, Warehouse } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between gap-10 bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-primary-foreground/15">
            <Boxes className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Grosir</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/60">
              Operating System
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <p className="max-w-sm text-2xl font-semibold leading-snug tracking-tight">
            Satu konsol untuk stok, pembelian, dan penjualan grosir.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/75">
            <li className="flex items-start gap-2.5">
              <Warehouse className="mt-0.5 size-4 shrink-0" />
              <span>Stok per gudang dengan nilai persediaan berjalan.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Boxes className="mt-0.5 size-4 shrink-0" />
              <span>Kasir cepat dengan satuan multi-kemasan.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <span>Jejak audit penuh untuk setiap perubahan.</span>
            </li>
          </ul>
        </div>

        <div className="text-[11px] text-primary-foreground/50">
          Akses hanya untuk pengguna terdaftar.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center gap-8 p-8 sm:p-12">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 lg:hidden">
            <Boxes className="size-5 text-primary" />
            <span className="text-sm font-semibold">Grosir</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Masuk ke akun Anda</h1>
          <p className="text-sm text-muted-foreground">
            Gunakan kredensial yang diberikan administrator toko.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
