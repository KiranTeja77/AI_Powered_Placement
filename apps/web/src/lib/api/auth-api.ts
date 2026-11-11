import { apiRequest } from './client'
import type {
  AuthResult,
  ChangePasswordRequest,
  Department,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from './types'

interface RawUser extends Omit<User, 'department' | 'student'> {
  department?: User['department']
  student?: User['student']
}

interface RawAuth {
  accessToken: string
  user: RawUser
}

const normalizeUser = (raw: RawUser): User => ({
  ...raw,
  department: raw.department ?? null,
  student: raw.student ?? null,
})

const normalizeAuth = (raw: RawAuth): AuthResult => ({
  accessToken: raw.accessToken,
  user: normalizeUser(raw.user),
})

export const authApi = {
  async login(body: LoginRequest): Promise<AuthResult> {
    return normalizeAuth(
      await apiRequest<RawAuth>('/auth/login', { method: 'POST', body, auth: false }),
    )
  },
  async refresh(): Promise<AuthResult> {
    return normalizeAuth(
      await apiRequest<RawAuth>('/auth/refresh', { method: 'POST', auth: false }),
    )
  },
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', auth: false }),
  register: (body: RegisterRequest) =>
    apiRequest<RawUser>('/auth/register', { method: 'POST', body, auth: false }),
  forgotPassword: (body: ForgotPasswordRequest) =>
    apiRequest<void>('/auth/forgot-password', { method: 'POST', body, auth: false }),
  resetPassword: (body: ResetPasswordRequest) =>
    apiRequest<void>('/auth/reset-password', { method: 'POST', body, auth: false }),
  changePassword: (body: ChangePasswordRequest) =>
    apiRequest<void>('/me/password', { method: 'POST', body }),
  departments: () => apiRequest<Department[]>('/departments', { auth: false }),
}
