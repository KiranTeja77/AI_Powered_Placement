import type { components } from './schema'

type Schemas = components['schemas']

export type Role = NonNullable<Schemas['UserResponse']['role']>
export type RegisterRequest = Schemas['RegisterRequest']
export type LoginRequest = Schemas['LoginRequest']
export type ChangePasswordRequest = Schemas['ChangePasswordRequest']
export type ResetPasswordRequest = Schemas['ResetPasswordRequest']
export type ForgotPasswordRequest = Schemas['ForgotPasswordRequest']

export type Department = Required<Schemas['DepartmentResponse']>

/** The generated response types mark every field optional; this is the shape the API returns. */
export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  status: 'ACTIVE' | 'INACTIVE'
  department: Department | null
  student: Required<Schemas['StudentProfile']> | null
}

export interface AuthResult {
  accessToken: string
  user: User
}

export const ROLES: readonly Role[] = ['STUDENT', 'FACULTY', 'TP_HEAD', 'ADMIN', 'RECRUITER']
