import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/lib/api/auth-api'
import { configureAuthHooks, setAccessToken } from '@/lib/api/client'
import type { LoginRequest, User } from '@/lib/api/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'
import { refreshSession } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Silent refresh on load, and on any 401 (the client retries the request once).
  useEffect(() => {
    let active = true
    configureAuthHooks({
      refresh: async () => {
        const result = await refreshSession()
        if (result && active) setUser(result.user)
        return result?.accessToken ?? null
      },
      onSessionLost: () => {
        setAccessToken(null)
        setUser(null)
        setStatus('unauthenticated')
        setSessionExpired(true)
        queryClient.clear()
      },
    })

    void refreshSession().then((result) => {
      if (!active) return
      setUser(result?.user ?? null)
      setStatus(result ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      active = false
      configureAuthHooks(null)
    }
  }, [queryClient])

  const login = useCallback(async (body: LoginRequest) => {
    const result = await authApi.login(body)
    setAccessToken(result.accessToken)
    setUser(result.user)
    setStatus('authenticated')
    setSessionExpired(false)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Clear local state even if the request failed; the cookie expires on its own.
      setAccessToken(null)
      setUser(null)
      setStatus('unauthenticated')
      setSessionExpired(false)
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, sessionExpired, login, logout }),
    [status, user, sessionExpired, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
