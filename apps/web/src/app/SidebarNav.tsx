import { Fragment } from 'react'
import { NavLink } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { NavItem } from './nav'

interface SidebarNavProps {
  items: NavItem[]
  /** Icons only (64 px sidebar). Labels move into tooltips. */
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ items, collapsed, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const link = (
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-3 rounded-md px-2.5 text-base font-medium',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary-subtle text-primary'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text',
                )
              }
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
          return (
            <Fragment key={item.to}>
              {item.group && !collapsed && (
                <li className="px-2.5 pt-4 pb-1 text-xs font-medium text-text-muted">
                  {item.group}
                </li>
              )}
              {item.group && collapsed && <li aria-hidden="true" className="my-2 h-px bg-border" />}
              <li>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            </Fragment>
          )
        })}
      </ul>
    </nav>
  )
}
