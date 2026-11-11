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

interface SubmitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  answered: number
  flagged: number
  total: number
  onConfirm: () => void
}

/** Submitting is final, so the dialog says exactly what is still open. */
export function SubmitDialog({
  open,
  onOpenChange,
  answered,
  flagged,
  total,
  onConfirm,
}: SubmitDialogProps) {
  const unanswered = total - answered
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit this assessment</DialogTitle>
          <DialogDescription>
            Submitting ends your attempt. You cannot change your answers afterwards.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-base text-text">
          <li>
            {answered} of {total} questions answered
          </li>
          <li className={unanswered > 0 ? 'text-warning' : undefined}>{unanswered} not answered</li>
          <li>{flagged} marked for review</li>
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep working</Button>
          </DialogClose>
          <Button onClick={onConfirm}>Submit assessment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
