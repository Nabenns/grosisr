import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getBrandById } from "@/modules/master-brand/queries"
import { BrandForm } from "@/modules/master-brand/components/brand-form"
import { PageHeader } from "@/components/page-header"

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("brand.write")) redirect("/forbidden")
  const { id } = await params
  const brand = await getBrandById(id)
  if (!brand) notFound()
  return (
    <div>
      <PageHeader title="Ubah Brand" />
      <BrandForm initial={{ id: brand.id, name: brand.name }} />
    </div>
  )
}
