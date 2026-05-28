"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateMyProfileAction, changeMyPasswordAction } from "@/modules/users/profile-actions"

interface ProfileValues {
  name: string
  email: string
}
interface PasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function ProfileForms({ initial }: { initial: { name: string; email: string | null } }) {
  const router = useRouter()
  const [pendingProfile, startProfile] = useTransition()
  const [pendingPwd, startPwd] = useTransition()

  const profile = useForm<ProfileValues>({
    defaultValues: { name: initial.name, email: initial.email ?? "" }
  })
  const password = useForm<PasswordValues>({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  })

  function onProfile(values: ProfileValues) {
    startProfile(async () => {
      const result = await updateMyProfileAction({
        name: values.name,
        email: values.email || null
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Profil diperbarui")
      router.refresh()
    })
  }

  function onPassword(values: PasswordValues) {
    if (values.newPassword !== values.confirmPassword) {
      password.setError("confirmPassword", { message: "Konfirmasi password tidak cocok" })
      return
    }
    startPwd(async () => {
      const result = await changeMyPasswordAction({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      })
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      toast.success("Password diganti")
      password.reset()
    })
  }

  return (
    <div className="space-y-8 max-w-xl">
      <form onSubmit={profile.handleSubmit(onProfile)} className="space-y-4">
        <h2 className="font-semibold">Info</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Nama</Label>
          <Input id="name" {...profile.register("name", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...profile.register("email")} />
        </div>
        <Button type="submit" disabled={pendingProfile}>
          {pendingProfile ? "Menyimpan..." : "Simpan Profil"}
        </Button>
      </form>

      <form onSubmit={password.handleSubmit(onPassword)} className="space-y-4 pt-6 border-t">
        <h2 className="font-semibold">Ganti Password</h2>
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Password Lama</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...password.register("currentPassword", { required: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Password Baru</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...password.register("newPassword", { required: true, minLength: 8 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...password.register("confirmPassword", { required: true })}
          />
          {password.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {password.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={pendingPwd}>
          {pendingPwd ? "Memproses..." : "Ganti Password"}
        </Button>
      </form>
    </div>
  )
}
