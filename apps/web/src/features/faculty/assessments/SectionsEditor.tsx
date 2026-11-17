import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AssessmentValues } from './schemas'

interface SectionsEditorProps {
  control: Control<AssessmentValues>
  register: UseFormRegister<AssessmentValues>
  errors: FieldErrors<AssessmentValues>
  /** Questions per section id, for the count and the remove buttons. */
  questions: AssessmentValues['questions']
  onRemoveQuestion: (id: string) => void
}

/** Sections in the order students meet them, with the questions picked for each. */
export function SectionsEditor({
  control,
  register,
  errors,
  questions,
  onRemoveQuestion,
}: SectionsEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'sections' })
  const groupError = errors.sections?.root?.message ?? errors.sections?.message

  return (
    <div className="grid gap-3">
      <ol className="grid gap-3">
        {fields.map((field, i) => {
          const mine = questions.filter((q) => q.sectionId === field.id)
          const nameError = errors.sections?.[i]?.name?.message
          return (
            <li key={field.id} className="rounded-md border border-border p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 w-5 text-sm text-text-muted tabular-nums">{i + 1}.</span>
                <div className="grid flex-1 gap-1">
                  <Input
                    aria-label={`Section ${i + 1} name`}
                    aria-invalid={nameError ? true : undefined}
                    placeholder="Section name, for example Aptitude"
                    {...register(`sections.${i}.name`)}
                  />
                  {nameError && <p className="text-sm text-danger">{nameError}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move section ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move section ${i + 1} down`}
                  disabled={i === fields.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove section ${i + 1}`}
                  disabled={fields.length <= 1}
                  onClick={() => remove(i)}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="mt-2 pl-7">
                {mine.length === 0 ? (
                  <p className="text-sm text-text-muted">No questions in this section yet.</p>
                ) : (
                  <ul className="grid gap-1">
                    {mine.map((q) => (
                      <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{q.text}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveQuestion(q.id)}
                        >
                          Remove<span className="sr-only"> question</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
          <Plus /> Add section
        </Button>
      </div>
    </div>
  )
}
