import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { MultiSelect } from '@/components/MultiSelect'
import { PageHeader } from '@/components/PageHeader'
import { Section } from '@/components/Section'
import { TextareaField } from '@/components/TextareaField'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { useSkillCatalogue } from '@/features/resume/queries'
import { useDepartmentOptions } from '@/lib/api/useDepartments'
import { notifyUnavailable } from '@/lib/notify'
import { driveSchema, type DriveValues } from './schemas'
import { StagesEditor } from './StagesEditor'

export default function DriveFormPage() {
  const departments = useDepartmentOptions()
  const skills = useSkillCatalogue(true)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DriveValues>({
    resolver: zodResolver(driveSchema),
    defaultValues: {
      company: '',
      role: '',
      description: '',
      ctc: '',
      location: '',
      departmentIds: [],
      graduationYear: '',
      minCgpa: '',
      minPercentage: '',
      maxBacklogs: '0',
      skillSlugs: [],
      stages: [{ id: crypto.randomUUID(), name: '' }],
      driveDate: '',
      criteriaSource: '',
    },
  })

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Home', to: '/tp' },
          { label: 'Drives', to: '/tp/drives' },
          { label: 'New drive' },
        ]}
        title="New drive"
        description="Enter what the company asked for. The criteria are checked against each student's record."
      />
      <form noValidate onSubmit={handleSubmit(notifyUnavailable)} className="max-w-4xl space-y-6">
        <Section title="The role">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <TextField label="Company" error={errors.company?.message} {...register('company')} />
            <TextField label="Role" error={errors.role?.message} {...register('role')} />
            <div className="sm:col-span-2">
              <TextareaField
                label="Job description"
                error={errors.description?.message}
                {...register('description')}
              />
            </div>
            <TextField
              label="CTC (lakh per year)"
              inputMode="decimal"
              error={errors.ctc?.message}
              {...register('ctc')}
            />
            <TextField
              label="Location"
              error={errors.location?.message}
              {...register('location')}
            />
            <TextField
              label="Drive date"
              type="date"
              error={errors.driveDate?.message}
              {...register('driveDate')}
            />
          </div>
        </Section>

        <Section title="Eligibility criteria">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="departmentIds"
                render={({ field }) => (
                  <MultiSelect
                    label="Eligible departments"
                    options={departments.options}
                    value={field.value}
                    onChange={field.onChange}
                    loading={departments.isLoading}
                    placeholder="Choose departments"
                    error={errors.departmentIds?.message}
                  />
                )}
              />
            </div>
            <TextField
              label="Graduation year"
              inputMode="numeric"
              error={errors.graduationYear?.message}
              {...register('graduationYear')}
            />
            <TextField
              label="Maximum backlogs"
              inputMode="numeric"
              hint="Use 0 for none allowed."
              error={errors.maxBacklogs?.message}
              {...register('maxBacklogs')}
            />
            <TextField
              label="Minimum CGPA (optional)"
              inputMode="decimal"
              error={errors.minCgpa?.message}
              {...register('minCgpa')}
            />
            <TextField
              label="Minimum percentage (optional)"
              inputMode="decimal"
              error={errors.minPercentage?.message}
              {...register('minPercentage')}
            />
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="skillSlugs"
                render={({ field }) => (
                  <MultiSelect
                    label="Required skills"
                    options={(skills.data ?? []).map((s) => ({ value: s.slug, label: s.name }))}
                    value={field.value}
                    onChange={field.onChange}
                    loading={skills.isLoading}
                    placeholder="Optional, choose skills"
                    hint={
                      skills.isError
                        ? 'The skill list could not be loaded. Reload to try again.'
                        : 'Students are matched against these using their resume analysis.'
                    }
                    error={errors.skillSlugs?.message}
                  />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label="Source of criteria"
                placeholder="Company email, 12 Nov"
                hint="Where these requirements came from, so they can be checked later."
                error={errors.criteriaSource?.message}
                {...register('criteriaSource')}
              />
            </div>
          </div>
        </Section>

        <Section title="Recruitment stages">
          <div className="p-4">
            <StagesEditor control={control} register={register} errors={errors} />
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save drive</Button>
          <Link to="/tp/drives" className="text-base text-primary hover:underline">
            Cancel
          </Link>
          <p className="text-sm text-text-muted">Saving is not available yet.</p>
        </div>
      </form>
    </>
  )
}
