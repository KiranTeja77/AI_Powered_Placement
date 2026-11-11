import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePendingItem, usePendingList, usePendingPage } from './pending'

describe('pending hooks', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('return empty results and never touch the network', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const list = renderHook(() => usePendingList<string>()).result.current
    const item = renderHook(() => usePendingItem<string>()).result.current
    const page = renderHook(() => usePendingPage<string>()).result.current

    expect(list).toMatchObject({ data: [], isLoading: false, isError: false })
    expect(item.data).toBeNull()
    expect(page.data).toEqual({ items: [], total: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
