import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export interface SectionTab {
  to: string
  label: string
  end?: boolean
}

/** Route-based tabs for sibling pages inside one section. */
export function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-4 flex gap-4 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              '-mb-px flex h-10 items-center border-b-2 px-1 text-base font-medium whitespace-nowrap',
              isActive
                ? 'border-primary text-text'
                : 'border-transparent text-text-muted hover:text-text',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
