import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getCategoryById, listAllCategoriesForSelect } from "@/modules/master-category/queries"
import { CategoryForm } from "@/modules/master-category/components/category-form"
import { PageHeader } from "@/components/page-header"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!session.user.permissionKeys.includes("category.write")) redirect("/forbidden")
  const { id } = await params
  const [category, parents] = await Promise.all([getCategoryById(id), listAllCategoriesForSelect()])
  if (!category) notFound()
  return (
    <div>
      <PageHeader title="Ubah Kategori" />
      <CategoryForm
        parentOptions={parents}
        initial={{ id: category.id, name: category.name, parentId: category.parentId }}
      />
    </div>
  )
}
