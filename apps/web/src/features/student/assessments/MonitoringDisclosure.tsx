import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { MONITORED } from './monitored'

interface MonitoringDisclosureProps {
  consented: boolean
  onConsentChange: (value: boolean) => void
}

/** What is monitored, what it is used for, and the consent the student must give to continue. */
export function MonitoringDisclosure({ consented, onConsentChange }: MonitoringDisclosureProps) {
  const id = useId()
  return (
    <div className="space-y-3 p-4">
      <div>
        <h3 className="text-base font-medium text-text">What is monitored</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-text">
          {MONITORED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-base font-medium text-text">What it is used for</h3>
        <p className="mt-1 text-base text-text">
          Each event becomes an alert that a faculty member or the placement team can review. An
          alert is for review, not proof that anything went wrong. People make the decision.
        </p>
      </div>
      <div>
        <h3 className="text-base font-medium text-text">In this version</h3>
        <p className="mt-1 text-base text-text">
          Nothing is recorded, stored or sent. This page shows what monitoring will cover so you can
          agree to it knowingly.
        </p>
      </div>
      <div className="flex items-start gap-2 border-t border-border pt-3">
        <Checkbox
          id={id}
          checked={consented}
          onCheckedChange={(v) => onConsentChange(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="font-normal">
          I have read what is monitored and I agree to be monitored during this assessment.
        </Label>
      </div>
    </div>
  )
}
