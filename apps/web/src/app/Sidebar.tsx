import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { NavItem } from './nav'
import { SidebarNav } from './SidebarNav'

interface SidebarProps {
  items: NavItem[]
  homePath: string
  collapsed: boolean
  onToggle: () => void
}

/** 240 px sidebar, collapsible to a 64 px icon rail. Hidden below 768 px (a sheet replaces it). */
export function Sidebar({ items, homePath, collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center' : 'px-4',
        )}
      >
        <Link to={homePath} className="text-md font-semibold text-text" aria-label="PlaceWise home">
          {collapsed ? 'PW' : 'PlaceWise'}
        </Link>
      </div>
      <TooltipProvider delayDuration={200}>
        <SidebarNav items={items} collapsed={collapsed} />
      </TooltipProvider>
      <div className={cn('border-t border-border p-2', collapsed && 'flex justify-center')}>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={cn(!collapsed && 'w-full justify-start')}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed && 'Collapse'}
        </Button>
      </div>
    </aside>
  )
}
