import { PageHeader } from '@/components/PageHeader'
import { useCurrentUser } from '@/features/auth/auth-context'
import { ROLE_HOME, ROLE_LABEL } from '@/features/auth/roles'
import { ChangePasswordForm } from './ChangePasswordForm'

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-base' : 'text-base'}>{value}</dd>
    </div>
  )
}

export default function AccountSettingsPage() {
  const user = useCurrentUser()
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: ROLE_HOME[user.role] }, { label: 'Account settings' }]}
        title="Account settings"
        description="Your sign-in details and password."
      />
      <section aria-labelledby="profile-heading" className="mb-8">
        <h2 id="profile-heading" className="mb-3 text-md font-semibold">
          Profile
        </h2>
        <dl className="max-w-2xl space-y-3 rounded-md border border-border bg-surface p-4">
          <Detail label="Name" value={user.fullName} />
          <Detail label="Email" value={user.email} />
          <Detail label="Role" value={ROLE_LABEL[user.role]} />
          {user.student && <Detail label="Roll number" value={user.student.rollNo} mono />}
          {user.department && (
            <Detail
              label="Department"
              value={`${user.department.code} · ${user.department.name}`}
            />
          )}
          {user.student && (
            <Detail label="Graduation year" value={String(user.student.graduationYear)} />
          )}
        </dl>
      </section>
      <section aria-labelledby="password-heading">
        <h2 id="password-heading" className="mb-1 text-md font-semibold">
          Change password
        </h2>
        <p className="mb-4 text-base text-text-muted">
          You will be signed out on every device and asked to sign in again.
        </p>
        <ChangePasswordForm />
      </section>
    </>
  )
}
