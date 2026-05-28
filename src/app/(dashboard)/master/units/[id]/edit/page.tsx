import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUnitById } from "@/modules/master-unit/queries"
import { UnitForm } from "@/modules/master-unit/components/unit-form"
import { PageHeader } from "@/components/page-header"

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("unit.write")) redirect("/forbidden")
  const { id } = await params
  const unit = await getUnitById(id)
  if (!unit) notFound()
  return (
    <div>
      <PageHeader title="Ubah Satuan" />
      <UnitForm initial={{ id: unit.id, name: unit.name }} />
    </div>
  )
}
