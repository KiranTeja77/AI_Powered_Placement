import { describe, expect, it } from 'vitest'
import { analyzeSchema, describeLength } from '../schemas'

const text = (n: number) => 'a'.repeat(n)

describe('analyzeSchema', () => {
  it('accepts exactly 200 and exactly 20,000 characters', () => {
    expect(analyzeSchema.safeParse({ text: text(200), targetRoles: [] }).success).toBe(true)
    expect(analyzeSchema.safeParse({ text: text(20_000), targetRoles: [] }).success).toBe(true)
  })

  it('says why text that is empty, too short or too long is rejected', () => {
    const message = (value: string) => {
      const result = analyzeSchema.safeParse({ text: value, targetRoles: [] })
      return result.success ? null : result.error.issues[0]?.message
    }
    expect(message('')).toBe('Paste your resume text')
    expect(message(text(199))).toBe('Use at least 200 characters')
    expect(message(text(20_001))).toBe('Use 20,000 characters or fewer')
  })

  it('does not count spaces around the text toward the minimum', () => {
    const padded = `${' '.repeat(300)}${text(50)}${' '.repeat(300)}`
    expect(analyzeSchema.safeParse({ text: padded, targetRoles: [] }).success).toBe(false)
  })

  it('allows up to 14 roles and no more', () => {
    const roles = (n: number) => Array.from({ length: n }, (_, i) => `role-${i}`)
    expect(analyzeSchema.safeParse({ text: text(200), targetRoles: roles(14) }).success).toBe(true)
    expect(analyzeSchema.safeParse({ text: text(200), targetRoles: roles(15) }).success).toBe(false)
  })
})

describe('describeLength', () => {
  it('counts down to the minimum, then reports ready, then the overflow', () => {
    expect(describeLength('')).toEqual({ message: '200 more characters needed', tone: 'warning' })
    expect(describeLength(text(150)).message).toBe('50 more characters needed')
    expect(describeLength(text(200))).toEqual({ message: 'Ready to analyze', tone: 'neutral' })
    expect(describeLength(text(20_005))).toEqual({ message: '5 over the limit', tone: 'danger' })
  })
})
