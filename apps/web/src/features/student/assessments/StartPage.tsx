import { Maximize } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAssessment } from '@/lib/api/pending'
import { formatDateTime, formatMinutes } from '../common/format'
import { Section } from '../common/Section'
import { DeviceCheck } from './DeviceCheck'
import { MonitoringDisclosure } from './MonitoringDisclosure'
import { useFullscreen } from './useFullscreen'
import { useMediaCheck } from './useMediaCheck'

const RULES = [
  'The timer starts when you press Start and keeps running if you leave the page.',
  'You can move between questions, change answers and mark questions for review until you submit.',
  'Submitting ends the attempt. Questions you did not answer get no marks.',
  'Stay on this tab, in full screen, for the whole assessment.',
  'Do not use notes, other people or other websites unless the instructions for this assessment allow it.',
]

function Done({ done }: { done: boolean }) {
  return <StatusBadge tone={done ? 'success' : 'neutral'} label={done ? 'Done' : 'Not done'} />
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="text-base text-text">{value}</dd>
    </div>
  )
}

/** Everything a student does before a test: read the rules, consent, check devices, go full screen. */
export default function StartPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const assessment = useAssessment(id).data
  const [consented, setConsented] = useState(false)
  const media = useMediaCheck()
  const fullscreen = useFullscreen()

  const devicesDone = media.status === 'ready'
  const remaining = [
    !consented && 'agree to monitoring',
    !devicesDone && 'check your camera and microphone',
    !fullscreen.active && 'enter full screen',
  ].filter((x): x is string => Boolean(x))
  const ready = remaining.length === 0

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/s' },
          { label: 'Assessments', to: '/s/assessments' },
          { label: 'Before you start' },
        ]}
        title={assessment?.title ?? 'Before you start'}
        description="Finish these steps to begin. They take about two minutes."
      />
      <div className="max-w-3xl space-y-6">
        <Section title="Assessment">
          <dl className="grid gap-3 p-4 sm:grid-cols-3">
            <Detail
              label="Duration"
              value={assessment ? formatMinutes(assessment.durationMinutes) : '—'}
            />
            <Detail label="Questions" value={assessment ? String(assessment.questionCount) : '—'} />
            <Detail label="Opens" value={assessment ? formatDateTime(assessment.startsAt) : '—'} />
          </dl>
        </Section>

        <Section title="1. Rules" description="Read these before you begin.">
          <ul className="list-disc space-y-1 py-4 pr-4 pl-9 text-base text-text">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Section>

        <Section title="2. Monitoring" action={<Done done={consented} />}>
          <MonitoringDisclosure consented={consented} onConsentChange={setConsented} />
        </Section>

        <Section title="3. Camera and microphone" action={<Done done={devicesDone} />}>
          <DeviceCheck check={media} />
        </Section>

        <Section title="4. Full screen" action={<Done done={fullscreen.active} />}>
          <div className="space-y-3 p-4">
            <p className="text-base text-text">
              The assessment runs in full screen. Leaving it shows a warning and may raise an alert
              for review.
            </p>
            {fullscreen.active ? (
              <Button variant="secondary" size="sm" onClick={() => void fullscreen.exit()}>
                Leave full screen
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!fullscreen.supported}
                onClick={() => void fullscreen.enter()}
              >
                <Maximize /> Enter full screen
              </Button>
            )}
            {!fullscreen.supported && (
              <p role="alert" className="text-base text-danger">
                This browser does not support full screen. Use a current desktop browser.
              </p>
            )}
            {fullscreen.error && (
              <p role="alert" className="text-base text-danger">
                {fullscreen.error}
              </p>
            )}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button disabled={!ready} onClick={() => navigate(`/s/assessments/${id}/take`)}>
            Start assessment
          </Button>
          <Link to="/s/assessments" className="text-base text-primary hover:underline">
            Back to assessments
          </Link>
          <p className="basis-full text-sm text-text-muted" aria-live="polite">
            {ready ? 'All steps are done.' : `To start, ${remaining.join(', ')}.`}
          </p>
        </div>
      </div>
    </>
  )
}
