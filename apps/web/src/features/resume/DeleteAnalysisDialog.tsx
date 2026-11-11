import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { describeError } from '@/lib/api/errors'
import { useDeleteAnalysis } from './queries'

interface DeleteAnalysisDialogProps {
  id: string
  /** Called after the analysis has been deleted. */
  onDeleted?: () => void
  /** The button that opens the dialog. Defaults to a secondary "Delete analysis" button. */
  trigger?: ReactNode
}

/** Asks before permanently deleting an analysis and the resume text stored with it. */
export function DeleteAnalysisDialog({ id, onDeleted, trigger }: DeleteAnalysisDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remove = useDeleteAnalysis()
  const client = useQueryClient()

  const confirm = async () => {
    setError(null)
    try {
      await remove.mutateAsync(id)
      setOpen(false)
      toast('Analysis deleted')
      onDeleted?.()
      // After the redirect has rendered: removing a query the page still observes would make it
      // refetch, get a 404 and replace the page before the redirect happens.
      setTimeout(() => client.removeQueries({ queryKey: ['analysis', id] }), 0)
    } catch (e) {
      setError(describeError(e))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm">
            <Trash2 /> Delete analysis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this analysis</DialogTitle>
          <DialogDescription>
            This permanently deletes the analysis and the resume text stored with it. It cannot be
            undone. Your other analyses are not affected.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-base text-danger">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={remove.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={() => void confirm()} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting' : 'Delete analysis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
