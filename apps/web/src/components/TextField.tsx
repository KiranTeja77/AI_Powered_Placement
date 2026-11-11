import { useId, type ComponentProps, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface TextFieldProps extends ComponentProps<typeof Input> {
  label: string
  error?: string
  hint?: string
  /** Extra control shown inside the input's right edge, e.g. a show/hide button. */
  adornment?: ReactNode
}

/** A labelled input with an inline error. Wired for screen readers via aria-describedby. */
export function TextField({
  label,
  error,
  hint,
  adornment,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generated = useId()
  const inputId = id ?? generated
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={adornment ? `pr-10 ${className ?? ''}` : className}
          {...props}
        />
        {adornment && <div className="absolute top-1/2 right-1 -translate-y-1/2">{adornment}</div>}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
