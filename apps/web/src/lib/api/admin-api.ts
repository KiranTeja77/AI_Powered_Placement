import { apiRequest } from './client'
import type {
  AdminOverview,
  AdminUser,
  AdminUserFilters,
  AdminUserPage,
  CreateUserInput,
} from './admin-types'
import type { PermissionMatrix } from './ops-types'

export const adminApi = {
  overview: () => apiRequest<AdminOverview>('/admin/overview'),
  permissions: () => apiRequest<PermissionMatrix>('/admin/permissions'),
  resendInvite: (id: string) =>
    apiRequest<AdminUser>(`/admin/users/${id}/resend-invite`, { method: 'POST' }),
  users: (f: AdminUserFilters) => {
    const params = new URLSearchParams({ page: String(f.page), size: String(f.size) })
    if (f.role) params.set('role', f.role)
    if (f.departmentId) params.set('departmentId', f.departmentId)
    if (f.status) params.set('status', f.status)
    if (f.q.trim()) params.set('q', f.q.trim())
    return apiRequest<AdminUserPage>(`/admin/users?${params}`)
  },
  createUser: (body: CreateUserInput) =>
    apiRequest<AdminUser>('/admin/users', { method: 'POST', body }),
  setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    apiRequest<AdminUser>(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } }),
}
