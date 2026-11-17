import { FileX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useQuestion } from '@/lib/api/pending'
import { QuestionForm } from './QuestionForm'

/** Create a question, or edit one when the route has an id. */
export default function QuestionFormPage() {
  const { id } = useParams()
  const existing = useQuestion(id ?? '')
  const editing = Boolean(id)
  const title = editing ? 'Edit question' : 'New question'
  const crumbs = [
    { label: 'Home', to: '/f' },
    { label: 'Question bank', to: '/f/questions' },
    { label: title },
  ]

  if (editing && !existing.data) {
    return (
      <>
        <PageHeader breadcrumbs={crumbs} title={title} />
        <div className="max-w-3xl rounded-md border border-border bg-surface">
          <EmptyState
            icon={FileX}
            title="Question not found"
            description="This question does not exist or you cannot edit it."
            action={
              <Link to="/f/questions" className="text-base text-primary hover:underline">
                Back to the question bank
              </Link>
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumbs={crumbs}
        title={title}
        description="Every field is checked before saving. The answer and explanation are shown to students after they submit."
      />
      <QuestionForm
        initial={
          existing.data
            ? {
                type: existing.data.type,
                text: existing.data.text,
                topic: existing.data.topic,
                difficulty: existing.data.difficulty,
                marks: String(existing.data.marks),
              }
            : undefined
        }
      />
    </>
  )
}
