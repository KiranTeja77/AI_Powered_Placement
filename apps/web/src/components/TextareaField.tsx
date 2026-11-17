import { useId, type ComponentProps } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TextareaFieldProps extends ComponentProps<typeof Textarea> {
  label: string
  error?: string
  hint?: string
}

/** A labelled textarea with an inline error. */
export function TextareaField({ label, error, hint, id, ...props }: TextareaFieldProps) {
  const generated = useId()
  const fieldId = id ?? generated
  const describedBy = [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
