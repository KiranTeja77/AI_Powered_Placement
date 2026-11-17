import { Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { QuestionValues } from './schemas'

interface TestCasesEditorProps {
  control: Control<QuestionValues>
  register: UseFormRegister<QuestionValues>
  errors: FieldErrors<QuestionValues>
}

/** Input and expected output for each test a coding answer is checked against. */
export function TestCasesEditor({ control, register, errors }: TestCasesEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'testCases' })
  const groupError = errors.testCases?.root?.message ?? errors.testCases?.message
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-text">Test cases</legend>
      <p className="text-sm text-text-muted">
        The first test case is shown to students as a sample. Write the question text above as the
        problem statement.
      </p>
      {fields.map((field, i) => (
        <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Textarea
            aria-label={`Test case ${i + 1} input`}
            placeholder="Input"
            className="min-h-16 font-mono text-sm"
            {...register(`testCases.${i}.input`)}
          />
          <div className="grid gap-1">
            <Textarea
              aria-label={`Test case ${i + 1} expected output`}
              placeholder="Expected output"
              aria-invalid={errors.testCases?.[i]?.expected ? true : undefined}
              className="min-h-16 font-mono text-sm"
              {...register(`testCases.${i}.expected`)}
            />
            {errors.testCases?.[i]?.expected && (
              <p className="text-sm text-danger">{errors.testCases[i]?.expected?.message}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove test case ${i + 1}`}
            onClick={() => remove(i)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {groupError && (
        <p role="alert" className="text-sm text-danger">
          {groupError}
        </p>
      )}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ input: '', expected: '' })}
        >
          <Plus /> Add test case
        </Button>
      </div>
    </fieldset>
  )
}
