import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { UnitForm } from "@/modules/master-unit/components/unit-form"
import { PageHeader } from "@/components/page-header"

export default async function NewUnitPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("unit.write")) redirect("/forbidden")
  return (
    <div>
      <PageHeader title="Tambah Satuan" />
      <UnitForm />
    </div>
  )
}
