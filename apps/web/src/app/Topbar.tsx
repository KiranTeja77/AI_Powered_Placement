import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountMenu } from './AccountMenu'
import { GlobalSearch } from './GlobalSearch'
import type { NavItem } from './nav'
import { NotificationsMenu } from './NotificationsMenu'
import { ThemeToggle } from './ThemeToggle'

interface TopbarProps {
  items: NavItem[]
  onOpenMenu: () => void
}

/** 56 px top bar: menu (mobile), search, notifications, theme, account. */
export function Topbar({ items, onOpenMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={onOpenMenu}
      >
        <Menu />
      </Button>
      <div className="flex-1">
        <GlobalSearch items={items} />
      </div>
      <NotificationsMenu />
      <ThemeToggle />
      <AccountMenu />
    </header>
  )
}
