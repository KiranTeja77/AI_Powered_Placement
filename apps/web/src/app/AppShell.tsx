import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useCurrentUser } from '@/features/auth/auth-context'
import { ROLE_HOME } from '@/features/auth/roles'
import { NAV } from './nav'
import { Sidebar } from './Sidebar'
import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'

const COLLAPSE_KEY = 'sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Sidebar, top bar and content area shared by every signed-in screen. */
export function AppShell() {
  const user = useCurrentUser()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [sheetOpen, setSheetOpen] = useState(false)
  const items = NAV[user.role]

  const toggle = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !value
    })
  }

  // Move focus to the content on navigation so keyboard and screen-reader users land on the page.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar
        items={items}
        homePath={ROLE_HOME[user.role]}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="gap-0 p-0 md:hidden">
          <SheetTitle className="flex h-14 items-center border-b border-border px-4">
            PlaceWise
          </SheetTitle>
          <SheetDescription className="sr-only">Navigation</SheetDescription>
          <TooltipProvider>
            <SidebarNav items={items} onNavigate={() => setSheetOpen(false)} />
          </TooltipProvider>
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar items={items} onOpenMenu={() => setSheetOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6">
          <div className="mx-auto max-w-[1280px] md:mx-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
