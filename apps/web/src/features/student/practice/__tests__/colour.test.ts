import { describe, expect, it } from 'vitest'
import { toHex } from '../colour'

describe('toHex', () => {
  it('expands the shorthand a minified stylesheet produces', () => {
    expect(toHex('#fff')).toBe('#ffffff')
    expect(toHex(' #1a2 ')).toBe('#11aa22')
    expect(toHex('#abcd')).toBe('#aabbccdd')
  })

  it('leaves full hex alone and lower-cases it', () => {
    expect(toHex('#1F5A7A')).toBe('#1f5a7a')
    expect(toHex('#1f5a7a80')).toBe('#1f5a7a80')
  })

  it('converts rgb and rgba', () => {
    expect(toHex('rgb(31, 90, 122)')).toBe('#1f5a7a')
    expect(toHex('rgb(31 90 122 / 50%)')).toBe('#1f5a7a80')
    expect(toHex('rgba(0, 0, 0, 0.4)')).toBe('#00000066')
  })

  it('says so when it cannot', () => {
    expect(() => toHex('red')).toThrow(/Cannot turn/)
    expect(() => toHex('')).toThrow()
  })
})
