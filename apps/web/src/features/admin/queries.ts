import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api/admin-api'
import type { AdminUserFilters } from '@/lib/api/admin-types'

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => adminApi.users(filters),
    placeholderData: keepPreviousData,
  })
}

export function useCreateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useSetUserStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      adminApi.setStatus(id, status),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
