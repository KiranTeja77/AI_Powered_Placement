import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, configureAuthHooks, setAccessToken } from './client'
import { ApiError } from './errors'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const authHeader = (call: unknown[]) =>
  (call[1] as { headers: Record<string, string> }).headers.Authorization

describe('apiRequest', () => {
  beforeEach(() => setAccessToken(null))
  afterEach(() => {
    configureAuthHooks(null)
    vi.unstubAllGlobals()
  })

  it('sends the in-memory access token and includes cookies', async () => {
    setAccessToken('abc')
    const fetchMock = stubFetch(json({ ok: true }))
    await apiRequest('/me')
    expect(authHeader(fetchMock.mock.calls[0]!)).toBe('Bearer abc')
    expect((fetchMock.mock.calls[0]![1] as RequestInit).credentials).toBe('include')
  })

  it('never writes the token to web storage', async () => {
    setAccessToken('secret-token')
    stubFetch(json({}))
    await apiRequest('/me')
    expect(JSON.stringify({ ...localStorage })).not.toContain('secret-token')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('secret-token')
  })

  it('refreshes once on 401 and retries the request with the new token', async () => {
    setAccessToken('expired')
    const fetchMock = stubFetch(json({}, 401), json({ id: 1 }))
    const refresh = vi.fn().mockImplementation(async () => {
      setAccessToken('fresh')
      return 'fresh'
    })
    configureAuthHooks({ refresh, onSessionLost: vi.fn() })

    await expect(apiRequest('/me')).resolves.toEqual({ id: 1 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authHeader(fetchMock.mock.calls[1]!)).toBe('Bearer fresh')
  })

  it('ends the session when the retry is also rejected, without looping', async () => {
    const fetchMock = stubFetch(json({}, 401), json({}, 401))
    const onSessionLost = vi.fn()
    configureAuthHooks({ refresh: async () => 'fresh', onSessionLost })

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(onSessionLost).toHaveBeenCalledTimes(1)
  })

  it('ends the session when refresh fails', async () => {
    const fetchMock = stubFetch(json({}, 401))
    const onSessionLost = vi.fn()
    configureAuthHooks({ refresh: async () => null, onSessionLost })

    await expect(apiRequest('/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onSessionLost).toHaveBeenCalledTimes(1)
  })

  it('does not refresh for the auth endpoints themselves', async () => {
    stubFetch(json({ detail: 'Email, roll number or password is incorrect.' }, 401))
    const refresh = vi.fn()
    configureAuthHooks({ refresh, onSessionLost: vi.fn() })

    await expect(
      apiRequest('/auth/login', { method: 'POST', body: {}, auth: false }),
    ).rejects.toThrow('Email, roll number or password is incorrect.')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('turns problem+json into an ApiError with field errors, code and retry-after', async () => {
    stubFetch(
      json({ detail: 'Too many.', code: 'too_many_attempts', errors: { email: 'Taken' } }, 429, {
        'Retry-After': '120',
      }),
    )
    const error = (await apiRequest('/x').catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      code: 'too_many_attempts',
      fieldErrors: { email: 'Taken' },
      retryAfterSeconds: 120,
    })
  })

  it('returns undefined for 204 and 202', async () => {
    stubFetch(new Response(null, { status: 204 }), new Response(null, { status: 202 }))
    await expect(apiRequest('/a', { method: 'POST' })).resolves.toBeUndefined()
    await expect(apiRequest('/b', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed')))
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 0 })
  })
})
