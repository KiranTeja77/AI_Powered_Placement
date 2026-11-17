import { FileSpreadsheet, FileText, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ConsentStatus, ShortlistReport } from '@/lib/api/tp-types'
import { notifyUnavailable } from '@/lib/notify'

const CONSENT: Record<ConsentStatus, { label: string; tone: StatusTone }> = {
  given: { label: 'Consent given', tone: 'success' },
  pending: { label: 'Consent pending', tone: 'warning' },
  declined: { label: 'Declined', tone: 'danger' },
}

/** Pick candidates for a shortlist. Only students who agreed to share their profile can be picked. */
export function ShortlistView({ report }: { report: ShortlistReport }) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const approve = () => {
    setConfirming(false)
    notifyUnavailable()
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/tp' },
          { label: 'Drives', to: '/tp/drives' },
          { label: report.driveTitle },
          { label: 'Shortlist' },
        ]}
        title={`Shortlist, ${report.driveTitle}`}
        description="Recruiters see only the students you approve here, and only those who consented."
        action={
          <Button disabled={picked.size === 0} onClick={() => setConfirming(true)}>
            Approve shortlist
          </Button>
        }
      />
      <div className="max-w-5xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-text-muted" aria-live="polite">
            {picked.size} of {report.candidates.length} selected
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={notifyUnavailable}>
              <FileSpreadsheet /> Export Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={notifyUnavailable}>
              <FileText /> Export PDF
            </Button>
          </div>
        </div>
        <Section title="Eligible students">
          {report.candidates.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="No candidates yet"
              description="Eligible students appear here with their consent status, ready to be shortlisted."
            />
          ) : (
            <ul className="divide-y divide-border">
              {report.candidates.map((c) => {
                const can = c.consent === 'given'
                const id = `pick-${c.studentId}`
                return (
                  <li key={c.studentId} className="flex items-start gap-3 px-4 py-3">
                    <Checkbox
                      id={id}
                      className="mt-1"
                      disabled={!can}
                      checked={picked.has(c.studentId)}
                      onCheckedChange={(v) => toggle(c.studentId, v === true)}
                    />
                    <label htmlFor={id} className="min-w-0 flex-1 text-base text-text">
                      {c.name}
                      <span className="block text-sm text-text-muted">
                        <span className="font-mono">{c.rollNo}</span>, {c.department}
                        {c.cgpa !== null && `, CGPA ${c.cgpa.toFixed(2)}`}
                      </span>
                      {!can && (
                        <span className="block text-sm text-text-muted">
                          Cannot be shortlisted without consent to share.
                        </span>
                      )}
                    </label>
                    <StatusBadge tone={CONSENT[c.consent].tone} label={CONSENT[c.consent].label} />
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this shortlist</DialogTitle>
            <DialogDescription>
              {picked.size} {picked.size === 1 ? 'student' : 'students'} will become visible to the
              recruiter for {report.driveTitle}. This cannot be taken back once the recruiter has
              seen it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep editing</Button>
            </DialogClose>
            <Button onClick={approve}>Approve shortlist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
