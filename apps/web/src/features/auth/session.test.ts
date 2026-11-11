import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken, setAccessToken } from '@/lib/api/client'
import { clearSharedSession, refreshSession } from './session'

const user = { id: '1', email: 'a@b.c', fullName: 'A', role: 'STUDENT', status: 'ACTIVE' }
const ok = () =>
  new Response(JSON.stringify({ accessToken: 'new-token', user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('refreshSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
    // The module remembers the last session for other tabs; start each test from a clean slate.
    clearSharedSession()
  })

  it('shares one request between simultaneous callers (rotation would otherwise look like replay)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([refreshSession(), refreshSession()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
    expect(getAccessToken()).toBe('new-token')
    expect(a?.user.department).toBeNull()
    expect(a?.user.student).toBeNull()
  })

  it('allows a new refresh after the previous one finished', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    await refreshSession()
    await refreshSession()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('resolves null and clears the token when the session is gone', async () => {
    setAccessToken('stale')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"detail":"expired"}', { status: 401 })),
    )
    await expect(refreshSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })
})
