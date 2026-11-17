import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DriveValues } from './schemas'

interface StagesEditorProps {
  control: Control<DriveValues>
  register: UseFormRegister<DriveValues>
  errors: FieldErrors<DriveValues>
}

/** Recruitment stages in the order candidates go through them. */
export function StagesEditor({ control, register, errors }: StagesEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'stages' })
  const groupError = errors.stages?.root?.message ?? errors.stages?.message
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-text">Recruitment stages</legend>
      <ol className="grid gap-2">
        {fields.map((field, i) => {
          const nameError = errors.stages?.[i]?.name?.message
          return (
            <li key={field.id} className="flex items-start gap-2">
              <span className="mt-2 w-5 text-sm text-text-muted tabular-nums">{i + 1}.</span>
              <div className="grid flex-1 gap-1">
                <Input
                  aria-label={`Stage ${i + 1} name`}
                  aria-invalid={nameError ? true : undefined}
                  placeholder="For example Online test"
                  {...register(`stages.${i}.name`)}
                />
                {nameError && <p className="text-sm text-danger">{nameError}</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move stage ${i + 1} up`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move stage ${i + 1} down`}
                disabled={i === fields.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove stage ${i + 1}`}
                disabled={fields.length <= 1}
                onClick={() => remove(i)}
              >
                <Trash2 />
              </Button>
            </li>
          )
        })}
      </ol>
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
          onClick={() => append({ id: crypto.randomUUID(), name: '' })}
        >
          <Plus /> Add stage
        </Button>
      </div>
    </fieldset>
  )
}
