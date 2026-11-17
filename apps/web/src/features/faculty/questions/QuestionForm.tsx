import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { SelectField } from '@/components/SelectField'
import { TextareaField } from '@/components/TextareaField'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { notifyUnavailable } from '@/lib/notify'
import { OptionsEditor } from './OptionsEditor'
import { DIFFICULTIES, QUESTION_TYPES, questionSchema, type QuestionValues } from './schemas'
import { TestCasesEditor } from './TestCasesEditor'

const blankOptions = () => [
  { text: '', correct: false },
  { text: '', correct: false },
]

export function QuestionForm({ initial }: { initial?: Partial<QuestionValues> }) {
  const departments = useDepartmentOptions()
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: 'mcq_single',
      text: '',
      topic: '',
      departmentId: '',
      difficulty: 'medium',
      marks: '1',
      explanation: '',
      options: blankOptions(),
      numericAnswer: '',
      tolerance: '',
      acceptedAnswers: '',
      testCases: [{ input: '', expected: '' }],
      ...initial,
    },
  })
  const type = useWatch({ control, name: 'type' })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(notifyUnavailable)}
      className="grid max-w-3xl gap-4 rounded-md border border-border bg-surface p-4"
    >
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <SelectField
            label="Question type"
            value={field.value}
            onChange={field.onChange}
            options={[...QUESTION_TYPES]}
            error={errors.type?.message}
          />
        )}
      />
      <TextareaField
        label={type === 'coding' ? 'Problem statement' : 'Question'}
        error={errors.text?.message}
        {...register('text')}
      />

      {(type === 'mcq_single' || type === 'mcq_multi') && (
        <OptionsEditor
          control={control}
          setValue={setValue}
          errors={errors}
          single={type === 'mcq_single'}
        />
      )}
      {type === 'numeric' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Correct answer"
            inputMode="decimal"
            error={errors.numericAnswer?.message}
            {...register('numericAnswer')}
          />
          <TextField
            label="Tolerance (optional)"
            inputMode="decimal"
            hint="Answers within this distance of the correct one are accepted."
            error={errors.tolerance?.message}
            {...register('tolerance')}
          />
        </div>
      )}
      {type === 'short' && (
        <TextareaField
          label="Accepted answers"
          hint="One per line. Matching ignores case and extra spaces."
          error={errors.acceptedAnswers?.message}
          {...register('acceptedAnswers')}
        />
      )}
      {type === 'coding' && (
        <TestCasesEditor control={control} register={register} errors={errors} />
      )}

      <TextareaField
        label="Explanation"
        hint="Shown to students when they review the answer."
        error={errors.explanation?.message}
        {...register('explanation')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Topic" error={errors.topic?.message} {...register('topic')} />
        <Controller
          control={control}
          name="departmentId"
          render={({ field }) => (
            <SelectField
              label="Department"
              value={field.value}
              onChange={field.onChange}
              options={departments.options}
              placeholder={departments.isLoading ? 'Loading departments' : 'Select a department'}
              error={errors.departmentId?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="difficulty"
          render={({ field }) => (
            <SelectField
              label="Difficulty"
              value={field.value}
              onChange={field.onChange}
              options={[...DIFFICULTIES]}
              error={errors.difficulty?.message}
            />
          )}
        />
        <TextField
          label="Marks"
          inputMode="decimal"
          error={errors.marks?.message}
          {...register('marks')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit">Save question</Button>
        <Link to="/f/questions" className="text-base text-primary hover:underline">
          Cancel
        </Link>
        <p className="text-sm text-text-muted">Saving is not available yet.</p>
      </div>
    </form>
  )
}
