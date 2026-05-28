import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { CustomerForm } from "@/modules/master-customer/components/customer-form"
import { PageHeader } from "@/components/page-header"

export default async function NewCustomerPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("customer.write")) redirect("/forbidden")
  return (
    <div>
      <PageHeader title="Tambah Customer" />
      <CustomerForm />
    </div>
  )
}
