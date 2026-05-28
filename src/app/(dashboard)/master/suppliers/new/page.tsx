import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SupplierForm } from "@/modules/master-supplier/components/supplier-form"
import { PageHeader } from "@/components/page-header"

export default async function NewSupplierPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("supplier.write")) redirect("/forbidden")
  return (
    <div>
      <PageHeader title="Tambah Supplier" />
      <SupplierForm />
    </div>
  )
}
