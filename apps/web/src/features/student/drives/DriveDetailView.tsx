import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { CriterionStatus, Drive } from '@/lib/api/student-types'
import { formatDate } from '../common/format'
import { notifyUnavailable } from '../common/notify'
import { Section } from '../common/Section'

const STATUS: Record<CriterionStatus, { label: string; tone: StatusTone }> = {
  met: { label: 'Met', tone: 'success' },
  not_met: { label: 'Not met', tone: 'danger' },
  unknown: { label: 'Unknown', tone: 'warning' },
}

const consentSchema = z.object({
  consent: z.boolean().refine((v) => v, 'Tick the box to agree before applying'),
})
type ConsentValues = z.infer<typeof consentSchema>

function overall(drive: Drive): { label: string; tone: StatusTone } {
  if (drive.criteria.some((c) => c.status === 'not_met'))
    return { label: 'Not eligible', tone: 'danger' }
  if (drive.criteria.some((c) => c.status === 'unknown'))
    return { label: 'Eligibility unknown', tone: 'warning' }
  return { label: 'Eligible', tone: 'success' }
}

function ConsentForm({ company }: { company: string }) {
  const {
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ConsentValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: { consent: false },
  })
  const checked = useWatch({ control, name: 'consent' })
  return (
    <form noValidate onSubmit={handleSubmit(notifyUnavailable)} className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <Checkbox
          id="share-consent"
          className="mt-0.5"
          checked={checked}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? 'share-consent-error' : undefined}
          onCheckedChange={(v) => setValue('consent', v === true, { shouldValidate: true })}
        />
        <Label htmlFor="share-consent" className="font-normal">
          I agree to share my profile, resume analysis and verified academic record with {company}{' '}
          for this drive. I can withdraw this before the deadline.
        </Label>
      </div>
      {errors.consent && (
        <p id="share-consent-error" className="text-sm text-danger">
          {errors.consent.message}
        </p>
      )}
      <Button type="submit">Apply to this drive</Button>
    </form>
  )
}

/** One drive: what it is, how the student measures up per criterion, and consent to apply. */
export function DriveDetailView({ drive }: { drive: Drive }) {
  const status = overall(drive)
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/s' },
          { label: 'Drives', to: '/s/drives' },
          { label: drive.company },
        ]}
        title={`${drive.company}, ${drive.role}`}
        description={`${drive.location}. Apply by ${formatDate(drive.deadline)}.`}
      />
      <div className="max-w-4xl space-y-6">
        <p className="text-base text-text">{drive.summary}</p>

        <Section
          title="Eligibility"
          description="Each criterion is checked against your profile and college record."
          action={<StatusBadge tone={status.tone} label={status.label} />}
        >
          <ul className="divide-y divide-border">
            {drive.criteria.map((c) => {
              const s = STATUS[c.status]
              return (
                <li
                  key={c.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center sm:gap-3"
                >
                  <span className="text-base font-medium text-text">{c.label}</span>
                  <span className="text-sm text-text-muted">Needs: {c.requirement}</span>
                  <span className="text-sm text-text-muted">
                    You: {c.yourValue ?? 'No record yet'}
                  </span>
                  <StatusBadge tone={s.tone} label={s.label} />
                </li>
              )
            })}
          </ul>
          <p className="border-t border-border px-4 py-3 text-sm text-text-muted">
            Unknown means a record needed for the check is not available yet. It does not mean you
            do not qualify.
          </p>
        </Section>

        <Section title="Share your profile">
          <ConsentForm company={drive.company} />
        </Section>
      </div>
    </>
  )
}
