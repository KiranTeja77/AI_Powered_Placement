import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Importance, RoleReadiness } from '@/lib/api/resume-types'
import { formatPoints } from './format'
import { IMPORTANCE } from './labels'

/** How many of each kind of skill the role needs were matched, partial, possible or missing. */
export function BreakdownTable({ role }: { role: RoleReadiness }) {
  return (
    <>
      <div className="hidden md:block">
        <Table aria-label={`Breakdown for ${role.name}`}>
          <TableHeader>
            <TableRow className="hover:bg-surface-muted">
              <TableHead>Skills the role needs</TableHead>
              <TableHead data-numeric="true">Matched</TableHead>
              <TableHead data-numeric="true">Partial</TableHead>
              <TableHead data-numeric="true">Possible</TableHead>
              <TableHead data-numeric="true">Missing</TableHead>
              <TableHead data-numeric="true">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {role.byImportance.map((group) => (
              <TableRow key={group.importance}>
                <TableCell>
                  {IMPORTANCE[group.importance as Importance]}{' '}
                  <span className="text-text-muted">(worth {group.weight} each)</span>
                </TableCell>
                <TableCell data-numeric="true">{group.matched}</TableCell>
                <TableCell data-numeric="true">{group.partial}</TableCell>
                <TableCell data-numeric="true">{group.possible}</TableCell>
                <TableCell data-numeric="true">{group.missing}</TableCell>
                <TableCell data-numeric="true">
                  {formatPoints(group.earned)} of {formatPoints(group.maximum)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y divide-border md:hidden" aria-label={`Breakdown for ${role.name}`}>
        {role.byImportance.map((group) => (
          <li key={group.importance} className="space-y-0.5 py-2.5 text-base">
            <p className="font-medium text-text">
              {IMPORTANCE[group.importance as Importance]}{' '}
              <span className="font-normal text-text-muted">(worth {group.weight} each)</span>
            </p>
            <p className="text-text-muted">
              {group.matched} matched, {group.partial} partial, {group.possible} possible,{' '}
              {group.missing} missing
            </p>
            <p className="text-text-muted">
              {formatPoints(group.earned)} of {formatPoints(group.maximum)} points
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
