import type { CriterionResult } from '@/lib/api/tp-types'

/** Not eligible if any criterion fails; unknown if none fails but one cannot be checked. */
export function overallResult(results: CriterionResult[]): CriterionResult {
  if (results.includes('not_met')) return 'not_met'
  if (results.includes('unknown')) return 'unknown'
  return 'met'
}

export const OVERALL_LABEL: Record<CriterionResult, string> = {
  met: 'Eligible',
  not_met: 'Not eligible',
  unknown: 'Cannot be confirmed',
}
