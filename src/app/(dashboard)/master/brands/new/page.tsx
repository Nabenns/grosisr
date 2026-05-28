import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { BrandForm } from "@/modules/master-brand/components/brand-form"
import { PageHeader } from "@/components/page-header"

export default async function NewBrandPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("brand.write")) redirect("/forbidden")
  return (
    <div>
      <PageHeader title="Tambah Brand" />
      <BrandForm />
    </div>
  )
}
