import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/auth-context'
import { notifyUnavailable } from '../common/notify'
import { Section } from '../common/Section'
import { ChecklistPanel } from './ChecklistPanel'
import { DepartmentField } from './DepartmentField'
import { profileSchema, type ProfileValues } from './schemas'

function ProfileForm() {
  const user = useCurrentUser()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      departmentId: user.department?.id ?? '',
      graduationYear: user.student?.graduationYear,
      phone: '',
      linkedin: '',
      github: '',
    },
  })

  return (
    <Section
      title="Personal details"
      description="Keep these current. Recruiters see them only after you consent to share."
    >
      <form
        noValidate
        onSubmit={handleSubmit(notifyUnavailable)}
        className="grid gap-4 p-4 sm:grid-cols-2"
      >
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField label="College email" value={user.email} readOnly hint="Set at registration." />
        <div className="grid gap-1.5">
          <TextField
            label="Roll number"
            value={user.student?.rollNo ?? ''}
            readOnly
            className="font-mono"
            hint="Set at registration."
          />
        </div>
        <TextField
          label="Mobile number"
          inputMode="numeric"
          autoComplete="tel-national"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <DepartmentField
          control={control}
          name="departmentId"
          error={errors.departmentId?.message}
        />
        <TextField
          label="Graduation year"
          type="number"
          inputMode="numeric"
          error={errors.graduationYear?.message}
          {...register('graduationYear', { valueAsNumber: true })}
        />
        <TextField
          label="LinkedIn profile"
          type="url"
          placeholder="https://"
          error={errors.linkedin?.message}
          {...register('linkedin')}
        />
        <TextField
          label="GitHub profile"
          type="url"
          placeholder="https://"
          error={errors.github?.message}
          {...register('github')}
        />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit">Save profile</Button>
          <p className="text-sm text-text-muted">Saving is not available yet.</p>
        </div>
      </form>
    </Section>
  )
}

function AcademicRecord() {
  return (
    <Section
      title="Academic record"
      description="Marks and CGPA are imported by your college, not typed in by you."
      action={<StatusBadge tone="neutral" label="Not verified" />}
    >
      <EmptyState
        icon={GraduationCap}
        title="No academic record yet"
        description="Once your college imports your marks, they appear here with a Verified by college badge."
      />
    </Section>
  )
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: 'Profile' }]}
        title="Profile"
      />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <ProfileForm />
          <AcademicRecord />
        </div>
        <ChecklistPanel />
      </div>
    </>
  )
}
