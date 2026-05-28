import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getSupplierById } from "@/modules/master-supplier/queries"
import { SupplierForm } from "@/modules/master-supplier/components/supplier-form"
import { PageHeader } from "@/components/page-header"

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("supplier.write")) redirect("/forbidden")
  const { id } = await params
  const supplier = await getSupplierById(id)
  if (!supplier) notFound()
  return (
    <div>
      <PageHeader title="Ubah Supplier" />
      <SupplierForm
        initial={{
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          address: supplier.address,
          npwp: supplier.npwp,
          termOfPaymentDays: supplier.termOfPaymentDays
        }}
      />
    </div>
  )
}
