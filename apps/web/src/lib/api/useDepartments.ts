import { useQuery } from '@tanstack/react-query'
import type { Option } from '@/components/SelectField'
import { authApi } from './auth-api'

/** The college's departments from the API (real), as select options. */
export function useDepartmentOptions(): { options: Option[]; isLoading: boolean } {
  const query = useQuery({ queryKey: ['departments'], queryFn: authApi.departments })
  return {
    options: (query.data ?? []).map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` })),
    isLoading: query.isLoading,
  }
}
