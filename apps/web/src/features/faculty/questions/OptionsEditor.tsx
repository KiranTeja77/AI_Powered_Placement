import { Plus, Trash2 } from 'lucide-react'
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { QuestionValues } from './schemas'

interface OptionsEditorProps {
  control: Control<QuestionValues>
  setValue: UseFormSetValue<QuestionValues>
  errors: FieldErrors<QuestionValues>
  single: boolean
}

/** Answer options with a "correct" mark each. A single-answer question allows one mark only. */
export function OptionsEditor({ control, setValue, errors, single }: OptionsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const groupError = errors.options?.root?.message ?? errors.options?.message

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-text">Options</legend>
      <p className="text-sm text-text-muted">
        {single ? 'Tick the one correct option.' : 'Tick every correct option.'}
      </p>
      {fields.map((field, i) => {
        const itemError = errors.options?.[i]?.text?.message
        return (
          <div key={field.id} className="flex items-start gap-2">
            <Controller
              control={control}
              name={`options.${i}.correct`}
              render={({ field: f }) => (
                <Checkbox
                  className="mt-2.5"
                  aria-label={`Option ${i + 1} is correct`}
                  checked={f.value}
                  onCheckedChange={(v) => {
                    if (single && v === true) {
                      fields.forEach((_, j) => setValue(`options.${j}.correct`, j === i))
                    } else {
                      f.onChange(v === true)
                    }
                  }}
                />
              )}
            />
            <div className="grid flex-1 gap-1">
              <Controller
                control={control}
                name={`options.${i}.text`}
                render={({ field: f }) => (
                  <Input
                    aria-label={`Option ${i + 1} text`}
                    aria-invalid={itemError ? true : undefined}
                    value={f.value}
                    onChange={f.onChange}
                    onBlur={f.onBlur}
                    placeholder={`Option ${i + 1}`}
                  />
                )}
              />
              {itemError && <p className="text-sm text-danger">{itemError}</p>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove option ${i + 1}`}
              disabled={fields.length <= 2}
              onClick={() => remove(i)}
            >
              <Trash2 />
            </Button>
          </div>
        )
      })}
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
          disabled={fields.length >= 8}
          onClick={() => append({ text: '', correct: false })}
        >
          <Plus /> Add option
        </Button>
      </div>
    </fieldset>
  )
}
