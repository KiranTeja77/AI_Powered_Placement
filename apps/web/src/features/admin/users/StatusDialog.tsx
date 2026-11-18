import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AdminUser } from '@/lib/api/admin-types'
import { describeError } from '@/lib/api/errors'
import { useSetUserStatus } from '../queries'

/** Asks before activating or deactivating an account. Deactivating signs the person out everywhere. */
export function StatusDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const setStatus = useSetUserStatus()
  const deactivating = user?.status === 'ACTIVE'

  const confirm = async () => {
    if (!user) return
    setError(null)
    try {
      await setStatus.mutateAsync({ id: user.id, status: deactivating ? 'INACTIVE' : 'ACTIVE' })
      toast(deactivating ? `${user.fullName} deactivated` : `${user.fullName} activated`)
      onClose()
    } catch (e) {
      setError(describeError(e))
    }
  }

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deactivating ? 'Deactivate this account' : 'Activate this account'}
          </DialogTitle>
          <DialogDescription>
            {deactivating
              ? `${user?.fullName} is signed out on every device straight away and cannot sign in until you activate the account again.`
              : `${user?.fullName} will be able to sign in again.`}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-base text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={setStatus.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={deactivating ? 'danger' : 'primary'}
            onClick={() => void confirm()}
            disabled={setStatus.isPending}
          >
            {setStatus.isPending ? 'Saving' : deactivating ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
