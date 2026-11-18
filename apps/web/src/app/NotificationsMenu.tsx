import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/lib/api/pending'

/** The bell in the top bar. It opens the notifications inbox, and shows a dot when something is unread. */
export function NotificationsMenu() {
  const { data } = useNotifications()
  const unread = data.filter((n) => !n.read).length
  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link
        to="/notifications"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary"
          />
        )}
      </Link>
    </Button>
  )
}
