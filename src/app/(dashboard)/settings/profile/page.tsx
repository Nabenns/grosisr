import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { ProfileForms } from "@/modules/users/components/profile-forms"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true }
  })
  return (
    <div>
      <PageHeader title="Profil Saya" description="Edit nama, email, dan password kamu." />
      <ProfileForms initial={{ name: me.name, email: me.email }} />
    </div>
  )
}
