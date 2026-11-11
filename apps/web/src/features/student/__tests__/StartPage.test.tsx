import { renderHook, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StartPage from '../assessments/StartPage'
import { DeviceCheck } from '../assessments/DeviceCheck'
import { statusForError, useMediaCheck, type MediaCheck } from '../assessments/useMediaCheck'
import { renderScreen } from './testing'

const hooks = vi.hoisted(() => ({
  media: { status: 'idle', stream: null, hearing: false } as Partial<MediaCheck>,
  fullscreen: { supported: true, active: false, error: null as string | null },
}))
vi.mock('../assessments/useFullscreen', () => ({
  useFullscreen: () => ({ ...hooks.fullscreen, enter: vi.fn(), exit: vi.fn() }),
}))

function check(partial: Partial<MediaCheck>): MediaCheck {
  return { status: 'idle', stream: null, hearing: false, start: vi.fn(), stop: vi.fn(), ...partial }
}

describe('statusForError', () => {
  it.each([
    ['NotAllowedError', 'denied'],
    ['SecurityError', 'denied'],
    ['NotFoundError', 'no-device'],
    ['OverconstrainedError', 'no-device'],
    ['NotReadableError', 'in-use'],
    ['AbortError', 'in-use'],
    ['SomethingElse', 'error'],
  ])('%s becomes %s', (name, expected) => {
    expect(statusForError(new DOMException('x', name))).toBe(expected)
  })
})

describe('DeviceCheck', () => {
  it.each([
    ['denied', /access is blocked/],
    ['no-device', /No camera or microphone was found/],
    ['in-use', /being used by another app/],
    ['unsupported', /cannot reach a camera/],
  ] as const)('explains the %s state and offers another try', (status, message) => {
    render_(check({ status }))
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says nothing is recorded or sent', () => {
    render_(check({}))
    expect(screen.getByText(/Nothing is recorded or sent/)).toBeInTheDocument()
  })

  it('starts the check on request', async () => {
    const c = check({})
    render_(c)
    await userEvent.click(screen.getByRole('button', { name: 'Check camera and microphone' }))
    expect(c.start).toHaveBeenCalled()
  })
})

function render_(c: MediaCheck) {
  return renderScreen(<DeviceCheck check={c} />)
}

describe('useMediaCheck', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports a blocked camera without keeping anything open', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError'))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    const { result } = renderHook(() => useMediaCheck())
    await act(() => result.current.start())
    expect(result.current.status).toBe('denied')
    expect(result.current.stream).toBeNull()
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: true })
  })

  it('reports an unsupported browser', async () => {
    vi.stubGlobal('navigator', {})
    const { result } = renderHook(() => useMediaCheck())
    await act(() => result.current.start())
    expect(result.current.status).toBe('unsupported')
  })
})

describe('StartPage', () => {
  beforeEach(() => {
    hooks.fullscreen = { supported: true, active: false, error: null }
    hooks.media = { status: 'idle' }
  })

  const open = () =>
    renderScreen(<StartPage />, {
      route: '/s/assessments/x/start',
      path: '/s/assessments/:id/start',
    })

  it('lists the rules and exactly what is monitored', () => {
    open()
    expect(screen.getByRole('heading', { name: /1\. Rules/ })).toBeInTheDocument()
    expect(screen.getByText('Whether this window stays in full screen.')).toBeInTheDocument()
    expect(screen.getByText('Whether you switch to another tab or window.')).toBeInTheDocument()
    expect(screen.getByText(/for review, not proof/)).toBeInTheDocument()
  })

  it('keeps Start disabled until consent, devices and full screen are all done', async () => {
    open()
    const start = screen.getByRole('button', { name: 'Start assessment' })
    expect(start).toBeDisabled()
    expect(screen.getByText(/To start, agree to monitoring, check your camera/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /I have read what is monitored/ }))
    expect(start).toBeDisabled()
    expect(
      screen.getByText(/To start, check your camera and microphone, enter full screen/),
    ).toBeInTheDocument()
  })

  it('enables Start once everything is done', async () => {
    hooks.fullscreen = { supported: true, active: true, error: null }
    // The page uses the real media hook, so give it a working camera and microphone.
    const track = { stop: vi.fn(), addEventListener: vi.fn() }
    const stream = { getTracks: () => [track] } as unknown as MediaStream
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    })
    vi.stubGlobal(
      'AudioContext',
      class {
        createAnalyser() {
          return { fftSize: 0, getByteTimeDomainData: () => undefined }
        }
        createMediaStreamSource() {
          return { connect: () => undefined }
        }
        close() {
          return Promise.resolve()
        }
      },
    )
    open()
    await userEvent.click(screen.getByRole('checkbox', { name: /I have read what is monitored/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Check camera and microphone' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start assessment' })).toBeEnabled(),
    )
    expect(screen.getByText('All steps are done.')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})
