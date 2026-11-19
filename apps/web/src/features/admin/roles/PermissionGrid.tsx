import { Switch } from '@/components/ui/switch'
import type { Permission, PermissionMatrix } from '@/lib/api/ops-types'

const ACCESS_NOTE: Record<Permission['access'], string | null> = {
  public: 'Open to everyone, signed in or not',
  signed_in: 'Any signed-in account',
  roles: null,
}

/**
 * Roles across, permissions down. The switches are read-only: they show what each role may do,
 * and a screen reader hears a plain "allowed" or "not allowed" for each.
 */
export function PermissionGrid({ matrix }: { matrix: PermissionMatrix }) {
  const groups = [...new Set(matrix.permissions.map((p) => p.group))]
  return (
    <div
      className="relative overflow-x-auto"
      role="region"
      aria-label="Permission matrix"
      tabIndex={0}
    >
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">Permissions held by each role. Read only.</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th scope="col" className="p-3 text-left text-sm font-medium text-text-muted">
              Permission
            </th>
            {matrix.roles.map((r) => (
              <th
                key={r.id}
                scope="col"
                className="p-3 text-center text-sm font-medium whitespace-nowrap text-text-muted"
              >
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group} group={group} matrix={matrix} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupRows({ group, matrix }: { group: string; matrix: PermissionMatrix }) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={matrix.roles.length + 1}
          className="bg-surface px-3 pt-4 pb-1 text-left text-sm font-semibold text-text"
        >
          {group}
        </th>
      </tr>
      {matrix.permissions
        .filter((p) => p.group === group)
        .map((p) => (
          <tr key={p.id} className="border-b border-border">
            <th scope="row" className="p-3 text-left text-base font-normal text-text">
              {p.label}
              {ACCESS_NOTE[p.access] && (
                <span className="block text-sm text-text-muted">{ACCESS_NOTE[p.access]}</span>
              )}
              <span className="block font-mono text-xs break-all text-text-muted">
                {p.endpoints.join(', ')}
              </span>
            </th>
            {matrix.roles.map((r) => {
              const allowed = matrix.grants[p.id]?.includes(r.id) ?? false
              return (
                <td key={r.id} className="p-3 text-center">
                  <Switch
                    checked={allowed}
                    disabled
                    aria-label={`${r.label}: ${p.label}, ${allowed ? 'allowed' : 'not allowed'}`}
                  />
                </td>
              )
            })}
          </tr>
        ))}
    </>
  )
}
