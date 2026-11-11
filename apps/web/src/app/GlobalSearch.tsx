import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { NavItem } from './nav'

/** Global search: jump to any screen available to the current role. Records are not searchable yet. */
export function GlobalSearch({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <Button
        variant="secondary"
        className="hidden h-9 w-64 justify-start gap-2 font-normal text-text-muted sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="flex-1 text-left">Search pages</span>
        <kbd className="rounded-sm border border-border px-1.5 text-xs">Ctrl K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Search pages"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-24 translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Search pages</DialogTitle>
          <DialogDescription className="sr-only">
            Type to find a page, then press Enter.
          </DialogDescription>
          <Command>
            <CommandInput placeholder="Search pages" aria-label="Search pages" />
            <CommandList>
              <CommandEmpty>No pages match your search.</CommandEmpty>
              <CommandGroup heading="Pages">
                {items.map((item) => (
                  <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
                    <item.icon aria-hidden="true" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
