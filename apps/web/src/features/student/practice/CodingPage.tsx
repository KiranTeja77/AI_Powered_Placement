import { FileCode, FlaskConical } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCodingProblem } from '@/lib/api/pending'
import { Section } from '../common/Section'
import type { EditorLanguage } from './CodeEditor'

// Monaco is large, so it loads only on this page.
const CodeEditor = lazy(() => import('./CodeEditor'))

const LANGUAGES: { value: EditorLanguage; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
]

/** A disabled button that still explains itself to mouse and keyboard users. */
function Unavailable({ label, variant }: { label: string; variant?: 'primary' | 'secondary' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* The span takes focus and hover, because a disabled button does neither. */}
          <span tabIndex={0} className="inline-flex rounded-md">
            <Button variant={variant} disabled aria-disabled="true">
              {label}
              <span className="sr-only">, not available yet</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Not available yet</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function CodingPage() {
  const { id = '' } = useParams()
  const problem = useCodingProblem(id).data
  const [language, setLanguage] = useState<EditorLanguage>('python')
  const [code, setCode] = useState('')

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Coding practice' }]}
        title={problem?.title ?? 'Coding practice'}
        description="Read the problem, write a solution and check it against the sample tests."
      />
      <div className="grid max-w-6xl gap-6 lg:grid-cols-2">
        <Section
          title="Problem"
          action={
            problem && (
              <StatusBadge
                tone={
                  problem.difficulty === 'easy'
                    ? 'success'
                    : problem.difficulty === 'medium'
                      ? 'warning'
                      : 'danger'
                }
                label={problem.difficulty[0]!.toUpperCase() + problem.difficulty.slice(1)}
              />
            )
          }
        >
          {problem ? (
            <div className="space-y-3 p-4">
              <p className="text-base whitespace-pre-line text-text">{problem.statement}</p>
              {problem.constraints.length > 0 && (
                <div>
                  <h3 className="text-base font-medium text-text">Constraints</h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-sm text-text">
                    {problem.constraints.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={FileCode}
              title="No problem to show"
              description="The problem statement, constraints and examples appear here when this problem is published."
            />
          )}
        </Section>

        <div className="space-y-6">
          <section aria-label="Solution">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v as EditorLanguage)}>
                  <SelectTrigger id="language" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Unavailable label="Run" variant="secondary" />
                <Unavailable label="Submit" />
              </div>
            </div>
            <div className="h-[360px] overflow-hidden rounded-md border border-border bg-surface">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <CodeEditor language={language} value={code} onChange={setCode} />
              </Suspense>
            </div>
            <p className="mt-1.5 text-sm text-text-muted">
              Press Ctrl+M to make Tab move focus out of the editor.
            </p>
          </section>

          <Section title="Sample tests" description="Run checks your code against these.">
            {problem && problem.sampleTests.length > 0 ? (
              <ul className="divide-y divide-border">
                {problem.sampleTests.map((t, i) => (
                  <li key={t.id} className="grid gap-2 px-4 py-3 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-text-muted">Input {i + 1}</p>
                      <pre className="font-mono text-sm whitespace-pre-wrap text-text">
                        {t.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted">Expected output</p>
                      <pre className="font-mono text-sm whitespace-pre-wrap text-text">
                        {t.expectedOutput}
                      </pre>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={FlaskConical}
                title="No sample tests"
                description="Sample inputs and expected outputs for this problem appear here."
              />
            )}
          </Section>
        </div>
      </div>
    </>
  )
}
