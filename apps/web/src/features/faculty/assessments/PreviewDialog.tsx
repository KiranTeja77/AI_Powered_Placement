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
import { TRACKS, type AssessmentValues } from './schemas'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-base">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right text-text">{value}</dd>
    </div>
  )
}

const yes = (v: boolean) => (v ? 'Required' : 'Not required')

/** What a student sees about this assessment before they start. Works on an unfinished form. */
export function PreviewDialog({
  open,
  onOpenChange,
  values,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: AssessmentValues
}) {
  const sections = values.sections.filter((s) => s.name.trim() !== '')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{values.title.trim() || 'Untitled assessment'}</DialogTitle>
          <DialogDescription>This is what students see before they start.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border">
          <Row label="Track" value={TRACKS.find((t) => t.value === values.track)?.label ?? '—'} />
          <Row
            label="Duration"
            value={values.durationMinutes ? `${values.durationMinutes} min` : '—'}
          />
          <Row label="Total marks" value={values.totalMarks || '—'} />
          <Row
            label="Sections"
            value={sections.length ? sections.map((s) => s.name).join(', ') : '—'}
          />
          <Row label="Questions" value={String(values.questions.length)} />
          <Row label="Full screen" value={yes(values.fullScreenRequired)} />
          <Row label="Tab switches logged" value={values.tabSwitchLogging ? 'Yes' : 'No'} />
          <Row label="Camera" value={yes(values.cameraRequired)} />
          <Row label="Microphone" value={yes(values.microphoneRequired)} />
        </dl>
        {values.questions.length === 0 && (
          <p className="text-sm text-warning">This assessment has no questions yet.</p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close preview</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
