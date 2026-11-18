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
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-users'] })
      void client.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })
}

export function useSetUserStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      adminApi.setStatus(id, status),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-users'] })
      void client.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })
}

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin-overview'], queryFn: adminApi.overview })
}

/** What each role may do, as the API itself reports it. */
export function usePermissionMatrix() {
  return useQuery({
    queryKey: ['admin-permissions'],
    queryFn: adminApi.permissions,
    staleTime: Infinity,
  })
}

export function useResendInvite() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.resendInvite(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-users'] })
      void client.invalidateQueries({ queryKey: ['admin-overview'] })
    },
  })
}
