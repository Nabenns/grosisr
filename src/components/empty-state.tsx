import { type ReactNode } from "react"
import { Package } from "lucide-react"

interface Props {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground mb-3">{icon ?? <Package className="h-10 w-10" />}</div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
