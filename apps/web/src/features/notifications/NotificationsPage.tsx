import { BellOff, CheckCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotifications } from '@/lib/api/pending'
import type { NotificationItem } from '@/lib/api/ops-types'
import { formatDateTime } from '@/lib/format'
import { notifyUnavailable } from '@/lib/notify'
import { cn } from '@/lib/utils'

function Row({ item }: { item: NotificationItem }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden="true"
        className={cn(
          'mt-2 size-2 shrink-0 rounded-full',
          item.read ? 'bg-transparent' : 'bg-primary',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-base text-text', !item.read && 'font-medium')}>
          {item.to ? (
            <Link to={item.to} className="hover:underline">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
          {!item.read && <span className="sr-only"> (unread)</span>}
        </p>
        <p className="text-sm text-text-muted">{item.body}</p>
        <p className="text-xs text-text-muted">{formatDateTime(item.at)}</p>
      </div>
      {!item.read && (
        <Button variant="ghost" size="sm" onClick={notifyUnavailable}>
          Mark as read<span className="sr-only">: {item.title}</span>
        </Button>
      )}
    </li>
  )
}

export default function NotificationsPage() {
  const notifications = useNotifications()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'unread' ? 'unread' : 'all'
  const all = notifications.data
  const unread = all.filter((n) => !n.read)

  const body = (items: NotificationItem[], emptyTitle: string, emptyText: string) => {
    if (notifications.isLoading) {
      return (
        <div role="status" aria-label="Loading notifications" className="space-y-px p-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )
    }
    if (notifications.isError) {
      return (
        <ErrorState title="Notifications could not be loaded" onRetry={notifications.refetch} />
      )
    }
    if (items.length === 0) {
      return <EmptyState icon={BellOff} title={emptyTitle} description={emptyText} />
    }
    return (
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <Row key={n.id} item={n} />
        ))}
      </ul>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Notifications' }]}
        title="Notifications"
        description="Updates about assessments, drives and mentoring."
        action={
          <Button variant="secondary" disabled={unread.length === 0} onClick={notifyUnavailable}>
            <CheckCheck /> Mark all as read
          </Button>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(next) => setParams(next === 'all' ? {} : { tab: next }, { replace: true })}
        className="max-w-3xl"
      >
        <TabsList aria-label="Filter notifications">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="rounded-md border border-border bg-surface">
            {body(
              all,
              'No notifications yet',
              'Updates about your work appear here, newest first.',
            )}
          </div>
        </TabsContent>
        <TabsContent value="unread">
          <div className="rounded-md border border-border bg-surface">
            {body(unread, 'Nothing unread', 'Notifications you have not opened appear here.')}
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
