import { describe, expect, it } from 'vitest'
import {
  changePasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from './schemas'

describe('passwordSchema', () => {
  it.each(['abcdefg1', 'Passw0rdOk', '12345678a'])('accepts %s', (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(true)
  })

  it.each(['short1a', 'abcdefgh', '12345678', ''])('rejects %j', (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false)
  })

  it('rejects more than 72 bytes, as the API does', () => {
    expect(passwordSchema.safeParse('a1'.repeat(36)).success).toBe(true)
    expect(passwordSchema.safeParse('a1'.repeat(37)).success).toBe(false)
  })
})

describe('registerSchema', () => {
  const valid = {
    fullName: 'Asha Rao',
    email: 'asha@college.edu',
    rollNo: '21CS001',
    departmentId: 'dept-id',
    graduationYear: 2027,
    password: 'Sup3rSecret',
    confirmPassword: 'Sup3rSecret',
  }

  it('accepts a complete registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('reports field-level messages', () => {
    const result = registerSchema.safeParse({
      ...valid,
      email: 'nope',
      rollNo: '#',
      departmentId: '',
      graduationYear: Number.NaN,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0])
      expect(fields).toEqual(
        expect.arrayContaining(['email', 'rollNo', 'departmentId', 'graduationYear']),
      )
    }
  })

  it('requires the confirmation to match once the other fields are valid', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'different1' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['confirmPassword'])
  })
})

describe('other schemas', () => {
  it('login requires both fields', () => {
    expect(loginSchema.safeParse({ identifier: ' ', password: '' }).success).toBe(false)
    expect(loginSchema.safeParse({ identifier: 'a@b.c', password: 'x' }).success).toBe(true)
  })

  it('reset requires matching passwords', () => {
    expect(
      resetPasswordSchema.safeParse({ newPassword: 'Sup3rSecret', confirmPassword: 'Sup3rSecret2' })
        .success,
    ).toBe(false)
  })

  it('change password rejects reusing the current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Sup3rSecret',
      newPassword: 'Sup3rSecret',
      confirmPassword: 'Sup3rSecret',
    })
    expect(result.success).toBe(false)
  })
})
