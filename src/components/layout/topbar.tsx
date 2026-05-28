import { UserMenu } from "./user-menu"
import { WarehouseSwitcher } from "./warehouse-switcher"

interface Props {
  userName: string
  username: string
  warehouses: { id: string; name: string }[]
  currentWarehouseId: string | null
}

export function Topbar({ userName, username, warehouses, currentWarehouseId }: Props) {
  return (
    <header className="border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4" />
      <div className="flex items-center gap-2">
        <WarehouseSwitcher warehouses={warehouses} current={currentWarehouseId} />
        <UserMenu name={userName} username={username} />
      </div>
    </header>
  )
}
