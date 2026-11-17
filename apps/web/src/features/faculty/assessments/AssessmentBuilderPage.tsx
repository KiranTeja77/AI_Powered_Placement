import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { SelectField } from '@/components/SelectField'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { useQuestionBank } from '@/lib/api/pending'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { notifyUnavailable } from '@/lib/notify'
import { PreviewDialog } from './PreviewDialog'
import { ProctoringFields } from './ProctoringFields'
import { QuestionPicker } from './QuestionPicker'
import { assessmentSchema, TRACKS, type AssessmentValues } from './schemas'
import { SectionsEditor } from './SectionsEditor'

const firstSection = () => ({ id: crypto.randomUUID(), name: '' })

export default function AssessmentBuilderPage() {
  const bank = useQuestionBank()
  const departments = useDepartmentOptions()
  const [previewing, setPreviewing] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<AssessmentValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: '',
      track: 'technical',
      departmentId: '',
      durationMinutes: '60',
      totalMarks: '',
      startsAt: '',
      endsAt: '',
      sections: [firstSection()],
      questions: [],
      fullScreenRequired: true,
      tabSwitchLogging: true,
      cameraRequired: false,
      microphoneRequired: false,
      warningThreshold: '3',
    },
  })
  const questions = useWatch({ control, name: 'questions' })
  const sections = useWatch({ control, name: 'sections' })
  const picked = new Set(questions.map((q) => q.id))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/f' }, { label: 'New assessment' }]}
        title="New assessment"
        description="Set the details, choose questions and decide how the test is monitored."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={() => setPreviewing(true)}>
              Preview
            </Button>
            <Button type="submit" form="assessment-form">
              Publish
            </Button>
          </div>
        }
      />
      <form
        id="assessment-form"
        noValidate
        onSubmit={handleSubmit(notifyUnavailable)}
        className="max-w-4xl space-y-6"
      >
        <Section title="Details">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField label="Title" error={errors.title?.message} {...register('title')} />
            </div>
            <Controller
              control={control}
              name="track"
              render={({ field }) => (
                <SelectField
                  label="Track"
                  value={field.value}
                  onChange={field.onChange}
                  options={[...TRACKS]}
                  error={errors.track?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="departmentId"
              render={({ field }) => (
                <SelectField
                  label="Department"
                  value={field.value}
                  onChange={field.onChange}
                  options={departments.options}
                  placeholder={
                    departments.isLoading ? 'Loading departments' : 'Select a department'
                  }
                  error={errors.departmentId?.message}
                />
              )}
            />
            <TextField
              label="Duration (minutes)"
              inputMode="numeric"
              error={errors.durationMinutes?.message}
              {...register('durationMinutes')}
            />
            <TextField
              label="Total marks"
              inputMode="numeric"
              error={errors.totalMarks?.message}
              {...register('totalMarks')}
            />
            <TextField
              label="Window opens"
              type="datetime-local"
              error={errors.startsAt?.message}
              {...register('startsAt')}
            />
            <TextField
              label="Window closes"
              type="datetime-local"
              error={errors.endsAt?.message}
              {...register('endsAt')}
            />
          </div>
        </Section>

        <Section title="Sections" description="Students meet the sections in this order.">
          <div className="p-4">
            <SectionsEditor
              control={control}
              register={register}
              errors={errors}
              questions={questions}
              onRemoveQuestion={(id) =>
                setValue(
                  'questions',
                  getValues('questions').filter((q) => q.id !== id),
                )
              }
            />
          </div>
        </Section>

        <Section title="Questions" description="Pick from the question bank.">
          <div className="p-4">
            <QuestionPicker
              bank={bank.data}
              loading={bank.isLoading}
              picked={picked}
              sections={sections.map((s, i) => ({
                value: s.id,
                label: s.name.trim() || `Section ${i + 1}`,
              }))}
              onAdd={(rows, sectionId) =>
                setValue('questions', [
                  ...getValues('questions'),
                  ...rows.map((r) => ({ id: r.id, text: r.text, sectionId })),
                ])
              }
            />
          </div>
        </Section>

        <Section title="Proctoring">
          <div className="p-4">
            <ProctoringFields control={control} register={register} errors={errors} />
          </div>
        </Section>

        <p className="text-sm text-text-muted">Publishing is not available yet.</p>
      </form>
      <PreviewDialog open={previewing} onOpenChange={setPreviewing} values={getValues()} />
    </>
  )
}
