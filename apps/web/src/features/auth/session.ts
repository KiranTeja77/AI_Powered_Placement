import { authApi } from '@/lib/api/auth-api'
import { getAccessToken, setAccessToken } from '@/lib/api/client'
import type { AuthResult } from '@/lib/api/types'

const LOCK_NAME = 'placewise-refresh'
const CHANNEL_NAME = 'placewise-auth'
/** A token another tab obtained this recently is reused instead of rotating the cookie again. */
const REUSE_WINDOW_MS = 10_000

interface SharedSession {
  result: AuthResult
  at: number
}

let inflight: Promise<AuthResult | null> | null = null
let shared: SharedSession | null = null
let channel: BroadcastChannel | null = null

/**
 * Tabs tell each other about a fresh session over BroadcastChannel. The token travels in memory
 * between same-origin tabs only; it is never written to localStorage or any other storage.
 */
function openChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<SharedSession | null>) => {
    shared = event.data
  }
}

function broadcast(result: AuthResult) {
  shared = { result, at: Date.now() }
  channel?.postMessage(shared)
}

/** Runs `task` while holding a lock shared by every tab, or directly where Web Locks is missing. */
async function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return (await navigator.locks.request(LOCK_NAME, task)) as T
  }
  return task()
}

async function refreshOnce(): Promise<AuthResult | null> {
  // Another tab may have refreshed while this one waited for the lock: reuse its token. A token
  // this tab already holds is not reused, because it may be exactly the one the server rejected.
  if (
    shared &&
    Date.now() - shared.at < REUSE_WINDOW_MS &&
    shared.result.accessToken !== getAccessToken()
  ) {
    setAccessToken(shared.result.accessToken)
    return shared.result
  }
  try {
    const result = await authApi.refresh()
    setAccessToken(result.accessToken)
    broadcast(result)
    return result
  } catch {
    setAccessToken(null)
    return null
  }
}

/**
 * Exchanges the refresh cookie for a new access token.
 *
 * Refresh tokens rotate, and the server treats a second use of a rotated token as a stolen-token
 * replay and ends the session. So only one refresh may be in flight at a time:
 *  - within a tab, callers share one promise (React StrictMode calls effects twice in dev);
 *  - across tabs, a Web Lock makes the refreshes take turns, and a tab that waited reuses the
 *    token the previous holder just obtained.
 * The server's replay protection is unchanged and still strict.
 */
export function refreshSession(): Promise<AuthResult | null> {
  openChannel()
  inflight ??= withCrossTabLock(refreshOnce).finally(() => {
    inflight = null
  })
  return inflight
}

/** Forget the shared token in every tab on sign-out, so a later refresh always asks the server. */
export function clearSharedSession() {
  shared = null
  channel?.postMessage(null)
}
