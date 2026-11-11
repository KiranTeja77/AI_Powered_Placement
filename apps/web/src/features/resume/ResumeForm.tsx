import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { FormError } from '@/features/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, applyFieldErrors, describeError } from '@/lib/api/errors'
import { MAX_TEXT } from '@/lib/api/resume-types'
import { cn } from '@/lib/utils'
import { RolePicker } from './RolePicker'
import { useAnalyze, useCareerInterests, useRoles } from './queries'
import { analyzeSchema, describeLength, type AnalyzeValues } from './schemas'

const UNAVAILABLE =
  'Resume analysis is temporarily unavailable. Your text is still here, so try again in a moment.'

export function ResumeForm() {
  const navigate = useNavigate()
  const roles = useRoles()
  const interests = useCareerInterests()
  const analyze = useAnalyze()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AnalyzeValues>({
    resolver: zodResolver(analyzeSchema),
    defaultValues: { text: '', targetRoles: [] },
    // Hints show while typing; errors wait for a submit attempt, then update as the text changes.
    mode: 'onSubmit',
  })

  const text = useWatch({ control, name: 'text' })
  const chosen = useWatch({ control, name: 'targetRoles' })

  // Start from the roles the student marked as interests, once, unless they already picked some.
  const saved = interests.data?.roleSlugs
  const known = roles.data
  useEffect(() => {
    if (!saved || !known || saved.length === 0) return
    if (getValues('targetRoles').length > 0) return
    const slugs = known.map((r) => r.slug)
    setValue(
      'targetRoles',
      saved.filter((s) => slugs.includes(s)),
      { shouldDirty: false },
    )
  }, [saved, known, getValues, setValue])
  const fromInterests =
    !!saved &&
    saved.length > 0 &&
    chosen.length === saved.length &&
    saved.every((s) => chosen.includes(s))
  const length = describeLength(text)
  const busy = isSubmitting || analyze.isPending

  const onSubmit = async (values: AnalyzeValues) => {
    setFormError(null)
    try {
      const detail = await analyze.mutateAsync(values)
      navigate(`/s/resume/${detail.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) setFormError(UNAVAILABLE)
      else if (!applyFieldErrors(error, ['text', 'targetRoles'] as const, setError))
        setFormError(describeError(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-5">
      <div className="grid gap-1.5">
        <Label htmlFor="resume-text">Resume text</Label>
        <Textarea
          id="resume-text"
          rows={14}
          placeholder="Paste the text of your resume here"
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={`resume-text-count${errors.text ? ' resume-text-error' : ''}`}
          disabled={busy}
          className="min-h-72 leading-relaxed"
          {...register('text')}
        />
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          {errors.text ? (
            <p id="resume-text-error" className="text-sm text-danger">
              {errors.text.message}
            </p>
          ) : (
            <p
              className={cn(
                'text-sm',
                length.tone === 'warning' && 'text-warning',
                length.tone === 'danger' && 'text-danger',
                length.tone === 'neutral' && 'text-text-muted',
              )}
            >
              {length.message}
            </p>
          )}
          <p id="resume-text-count" aria-live="polite" className="text-sm text-text-muted">
            {text.length.toLocaleString('en-US')} of {MAX_TEXT.toLocaleString('en-US')} characters
          </p>
        </div>
        <p className="text-sm text-text-muted">
          Paste plain text. PDF and image upload are not available yet.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="target-roles">Target roles</Label>
        <Controller
          control={control}
          name="targetRoles"
          render={({ field }) => (
            <RolePicker
              id="target-roles"
              roles={roles.data}
              loading={roles.isLoading}
              failed={roles.isError}
              onRetry={() => void roles.refetch()}
              value={field.value}
              onChange={field.onChange}
              disabled={busy}
            />
          )}
        />
        {errors.targetRoles && <p className="text-sm text-danger">{errors.targetRoles.message}</p>}
        <p className="text-sm text-text-muted">
          {fromInterests
            ? 'Pre-selected from your career interests. Change them here for this analysis only.'
            : 'Leave empty to compare your resume with all 14 roles.'}
        </p>
      </div>

      <FormError message={formError} />
      <Button type="submit" disabled={busy}>
        {busy ? 'Analyzing resume' : 'Analyze resume'}
      </Button>
    </form>
  )
}
