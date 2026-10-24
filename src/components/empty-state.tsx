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
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative inline-block mb-4">
        <div className="absolute -inset-2 rounded-full bg-primary/10 blur-lg" />
        <div className="relative rounded-full bg-primary/10 ring-1 ring-primary/20 p-3 [&>svg]:h-7 [&>svg]:w-7 [&>svg]:text-primary">
          {icon ?? <Package />}
        </div>
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[360px] leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
