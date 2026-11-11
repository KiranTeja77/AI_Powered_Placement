import { ApiError, toApiError } from './errors'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const PREFIX = `${BASE}/api/v1`

/** The access token lives only in memory, never in localStorage. */
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

interface AuthHooks {
  /** Obtains a new access token via the refresh cookie, or null if the session is gone. */
  refresh: () => Promise<string | null>
  onSessionLost: () => void
}

let hooks: AuthHooks | null = null

export function configureAuthHooks(next: AuthHooks | null) {
  hooks = next
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Attach the access token and refresh once on 401. Off for the auth endpoints themselves. */
  auth?: boolean
  signal?: AbortSignal
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`
  try {
    return await fetch(`${PREFIX}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError({ status: 0, message: 'Cannot reach the server. Check your connection.' })
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)

  // One silent refresh and one retry; a second 401 ends the session.
  if (response.status === 401 && options.auth !== false && hooks) {
    const token = await hooks.refresh()
    if (token) {
      response = await send(path, options)
    }
    if (!token || response.status === 401) {
      hooks.onSessionLost()
    }
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204 || response.status === 202) return undefined as T
  return (await response.json()) as T
}
