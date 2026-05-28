import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listAllCategoriesForSelect } from "@/modules/master-category/queries"
import { CategoryForm } from "@/modules/master-category/components/category-form"
import { PageHeader } from "@/components/page-header"

export default async function NewCategoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("category.write")) redirect("/forbidden")
  const parents = await listAllCategoriesForSelect()
  return (
    <div>
      <PageHeader title="Tambah Kategori" />
      <CategoryForm parentOptions={parents} />
    </div>
  )
}
