import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { StoreForm } from "./store-form"

export default async function StoreSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("setting.write")) redirect("/forbidden")

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["store_name", "store_address", "store_phone"] } }
  })
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  return (
    <div>
      <PageHeader title="Profil Toko" description="Identitas toko untuk header dokumen + struk." />
      <StoreForm
        initial={{
          store_name: map.store_name ?? "",
          store_address: map.store_address ?? "",
          store_phone: map.store_phone ?? ""
        }}
      />
    </div>
  )
}
