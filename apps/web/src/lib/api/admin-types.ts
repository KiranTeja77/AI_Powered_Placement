import type { Role } from './types'

export interface AdminUser {
  id: string
  email: string
  fullName: string
  role: Role
  status: 'ACTIVE' | 'INACTIVE'
  department: { id: string; code: string; name: string } | null
  rollNo: string | null
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminUserPage {
  items: AdminUser[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface AdminUserFilters {
  page: number
  size: number
  role: string
  departmentId: string
  status: string
  q: string
}

export type StaffRole = 'FACULTY' | 'TP_HEAD' | 'RECRUITER' | 'ADMIN'

export interface CreateUserInput {
  fullName: string
  email: string
  role: StaffRole
  departmentId?: string
}
