import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getCustomerById } from "@/modules/master-customer/queries"
import { CustomerForm } from "@/modules/master-customer/components/customer-form"
import { PageHeader } from "@/components/page-header"

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("customer.write")) redirect("/forbidden")
  const { id } = await params
  const customer = await getCustomerById(id)
  if (!customer) notFound()
  return (
    <div>
      <PageHeader title="Ubah Customer" />
      <CustomerForm
        initial={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          customerType: customer.customerType,
          creditLimit: Number(customer.creditLimit),
          termOfPaymentDays: customer.termOfPaymentDays
        }}
      />
    </div>
  )
}
