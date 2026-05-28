import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { GeneralForm } from "./general-form"

export default async function GeneralSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("setting.write")) redirect("/forbidden")

  const setting = await prisma.setting.findUnique({ where: { key: "allow_negative_stock" } })
  const allowNegativeStock = setting?.value === "true"

  return (
    <div>
      <PageHeader title="Pengaturan Umum" description="Kebijakan operasional sistem (stok, dll)." />
      <GeneralForm allowNegativeStock={allowNegativeStock} />
    </div>
  )
}
