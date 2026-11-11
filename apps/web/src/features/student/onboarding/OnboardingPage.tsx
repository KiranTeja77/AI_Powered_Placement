import { Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { ResumeForm } from '@/features/resume/ResumeForm'
import { cn } from '@/lib/utils'
import { BasicsStep } from './BasicsStep'
import { EducationStep } from './EducationStep'
import { InterestsStep } from './InterestsStep'

const STEPS = ['Department and year', 'Education', 'Career interests', 'Resume'] as const

function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Progress" className="mb-6 flex flex-wrap gap-x-6 gap-y-2">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 text-base',
              state === 'todo' ? 'text-text-muted' : 'text-text',
            )}
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-sm tabular-nums',
                state === 'current' && 'border-primary bg-primary text-primary-foreground',
                state === 'done' && 'border-success text-success',
                state === 'todo' && 'border-border',
              )}
            >
              {state === 'done' ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={state === 'current' ? 'font-medium' : undefined}>
              {label}
              {state === 'done' && <span className="sr-only">, done</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** A four-step setup. Steps 3 and 4 are real; steps 1 and 2 say that saving is not available. */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Set up your profile' }]}
        title="Set up your profile"
        description="Four short steps so training and drives fit you. You can skip any of them."
      />
      <div className="max-w-3xl">
        <Stepper current={step} />
        <h2 className="mb-3 text-base font-semibold text-text">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </h2>
        {step === 0 && <BasicsStep onNext={next} />}
        {step === 1 && <EducationStep onNext={next} onBack={back} />}
        {step === 2 && <InterestsStep onNext={next} onBack={back} />}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-base text-text">
              Paste your resume text to see your skills and what each role expects. You can also do
              this later from the resume analyzer.
            </p>
            <ResumeForm />
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
              <Button variant="secondary" onClick={() => navigate('/s')}>
                Finish without analyzing
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
