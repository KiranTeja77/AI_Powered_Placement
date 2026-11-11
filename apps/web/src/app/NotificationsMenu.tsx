import { Bell, BellOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { usePendingList } from '@/lib/api/pending'

interface NotificationItem {
  id: string
  title: string
}

export function NotificationsMenu() {
  // TODO(api): GET /api/v1/notifications -> Page<Notification>
  const { data } = usePendingList<NotificationItem>()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-base font-medium">Notifications</p>
          <Link to="/notifications" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {data.length === 0 && (
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            description="Updates about assessments, drives and mentoring will appear here."
            className="py-8"
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
