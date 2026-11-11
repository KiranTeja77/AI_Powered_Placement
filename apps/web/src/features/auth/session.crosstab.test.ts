import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Lets two "tabs" (separate module instances) share one lock manager and one broadcast bus. */
class FakeLocks {
  private tail: Promise<unknown> = Promise.resolve()
  request<T>(_name: string, task: () => Promise<T>): Promise<T> {
    const run = this.tail.then(task, task)
    this.tail = run.catch(() => undefined)
    return run
  }
}

const channels: FakeBroadcastChannel[] = []
let syncDelivery = true

class FakeBroadcastChannel {
  onmessage: ((event: MessageEvent) => void) | null = null
  name: string
  constructor(name: string) {
    this.name = name
    channels.push(this)
  }
  postMessage(data: unknown) {
    for (const other of channels) {
      if (other === this || other.name !== this.name) continue
      const deliver = () => other.onmessage?.({ data } as MessageEvent)
      if (syncDelivery) deliver()
      else setTimeout(deliver, 20)
    }
  }
}

const user = { id: '1', email: 'a@b.c', fullName: 'A', role: 'STUDENT', status: 'ACTIVE' }

function stubServer() {
  let calls = 0
  let running = 0
  let maxRunning = 0
  const fetchMock = vi.fn(async () => {
    calls += 1
    running += 1
    maxRunning = Math.max(maxRunning, running)
    await new Promise((resolve) => setTimeout(resolve, 15))
    running -= 1
    return new Response(JSON.stringify({ accessToken: `token-${calls}`, user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, maxConcurrent: () => maxRunning }
}

async function openTab() {
  vi.resetModules()
  return import('./session')
}

describe('refreshSession across tabs', () => {
  beforeEach(() => {
    channels.length = 0
    syncDelivery = true
    vi.stubGlobal('navigator', { ...navigator, locks: new FakeLocks() })
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lets one tab refresh and the other reuse its token', async () => {
    const { fetchMock } = stubServer()
    const tabA = await openTab()
    const tabB = await openTab()

    const [a, b] = await Promise.all([tabA.refreshSession(), tabB.refreshSession()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a?.accessToken).toBe('token-1')
    expect(b?.accessToken).toBe('token-1')
  })

  it('never has two refresh requests in flight even if the broadcast arrives late', async () => {
    syncDelivery = false
    const { fetchMock, maxConcurrent } = stubServer()
    const tabA = await openTab()
    const tabB = await openTab()

    const results = await Promise.all([tabA.refreshSession(), tabB.refreshSession()])

    // Without the token message the second tab refreshes too, but strictly after the first.
    expect(results.every((r) => r !== null)).toBe(true)
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2)
    expect(maxConcurrent()).toBe(1)
  })

  it('does not reuse a shared token after sign-out', async () => {
    const { fetchMock } = stubServer()
    const tabA = await openTab()
    const tabB = await openTab()

    await tabA.refreshSession()
    tabA.clearSharedSession()
    const b = await tabB.refreshSession()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(b?.accessToken).toBe('token-2')
  })

  it('still works where Web Locks is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })
    const { fetchMock } = stubServer()
    const tab = await openTab()
    await expect(tab.refreshSession()).resolves.toMatchObject({ accessToken: 'token-1' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never writes the token to web storage', async () => {
    stubServer()
    const tab = await openTab()
    await tab.refreshSession()
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('token-')
  })
})
