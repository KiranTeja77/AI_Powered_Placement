import { setAccessToken } from '@/lib/api/client'
import { authApi } from '@/lib/api/auth-api'
import type { AuthResult } from '@/lib/api/types'

let inflight: Promise<AuthResult | null> | null = null

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * Single-flight on purpose: refresh tokens rotate, so two simultaneous calls would present the same
 * token twice and the server would treat the second as a stolen-token replay and end the session.
 * React StrictMode runs effects twice in development, which is exactly that case.
 */
export function refreshSession(): Promise<AuthResult | null> {
  inflight ??= authApi
    .refresh()
    .then((result) => {
      setAccessToken(result.accessToken)
      return result
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}
