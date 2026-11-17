import { ListChecks } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { SelectField, type Option } from '@/components/SelectField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { QuestionRow } from '@/lib/api/faculty-types'
import { DIFFICULTIES, QUESTION_TYPES } from '../questions/schemas'

const ALL = 'all'
const withAll = (word: string, list: readonly Option[]) => [{ value: ALL, label: word }, ...list]

interface QuestionPickerProps {
  bank: QuestionRow[]
  loading?: boolean
  picked: ReadonlySet<string>
  sections: Option[]
  onAdd: (rows: QuestionRow[], sectionId: string) => void
}

/** Filter the bank, tick questions, and add them to a section. */
export function QuestionPicker({ bank, loading, picked, sections, onAdd }: QuestionPickerProps) {
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState(ALL)
  const [type, setType] = useState(ALL)
  const [ticked, setTicked] = useState<string[]>([])
  const [target, setTarget] = useState('')

  const shown = bank.filter(
    (q) =>
      !picked.has(q.id) &&
      (difficulty === ALL || q.difficulty === difficulty) &&
      (type === ALL || q.type === type) &&
      `${q.text} ${q.topic}`.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const sectionId = target || sections[0]?.value || ''

  if (bank.length === 0 && !loading) {
    return (
      <EmptyState
        icon={ListChecks}
        title="The question bank is empty"
        description="Questions you add to the bank can be picked here and placed in sections."
      />
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          aria-label="Search questions"
          placeholder="Search questions"
          className="w-full sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectField
          label="Difficulty"
          hideLabel
          value={difficulty}
          onChange={setDifficulty}
          options={withAll('All difficulties', DIFFICULTIES)}
          className="w-full sm:w-44"
        />
        <SelectField
          label="Type"
          hideLabel
          value={type}
          onChange={setType}
          options={withAll('All types', QUESTION_TYPES)}
          className="w-full sm:w-56"
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-base text-text-muted">No questions match these filters.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {shown.map((q) => (
            <li key={q.id} className="flex items-start gap-3 px-3 py-2">
              <Checkbox
                id={`pick-${q.id}`}
                className="mt-1"
                checked={ticked.includes(q.id)}
                onCheckedChange={(v) =>
                  setTicked((t) => (v === true ? [...t, q.id] : t.filter((x) => x !== q.id)))
                }
              />
              <label htmlFor={`pick-${q.id}`} className="flex-1 text-base text-text">
                {q.text}
                <span className="block text-sm text-text-muted">
                  {q.topic}, {q.difficulty}, {q.marks} marks
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <SelectField
          label="Add to section"
          value={sectionId}
          onChange={setTarget}
          options={sections}
          className="grid w-full gap-1.5 sm:w-64"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={ticked.length === 0 || !sectionId}
          onClick={() => {
            onAdd(
              bank.filter((q) => ticked.includes(q.id)),
              sectionId,
            )
            setTicked([])
          }}
        >
          Add selected
        </Button>
      </div>
    </div>
  )
}
