import { useCallback, useEffect, useRef, useState } from 'react'

export type MediaStatus =
  'idle' | 'requesting' | 'ready' | 'denied' | 'no-device' | 'in-use' | 'unsupported' | 'error'

export const MEDIA_MESSAGES: Record<
  Exclude<MediaStatus, 'idle' | 'requesting' | 'ready'>,
  string
> = {
  denied:
    "Camera and microphone access is blocked. Allow access for this site in your browser's address bar or site settings, then try again.",
  'no-device': 'No camera or microphone was found. Connect one, then try again.',
  'in-use':
    'Your camera or microphone is being used by another app or browser tab. Close it, then try again.',
  unsupported:
    'This browser cannot reach a camera or microphone here. Use a current browser on a secure (https) page.',
  error: 'The camera or microphone could not be started. Check your devices, then try again.',
}

/** Maps the error a browser throws from getUserMedia to something the student can act on. */
export function statusForError(
  error: unknown,
): Exclude<MediaStatus, 'idle' | 'requesting' | 'ready'> {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError')
    return 'denied'
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  )
    return 'no-device'
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError')
    return 'in-use'
  return 'error'
}

export interface MediaCheck {
  status: MediaStatus
  stream: MediaStream | null
  /** True while the microphone is picking up sound. */
  hearing: boolean
  start: () => Promise<void>
  stop: () => void
}

/**
 * Opens the camera and microphone for a local preview and a sound check. The stream is attached to
 * a <video> element on this page and nowhere else: nothing is recorded, stored or sent. Every
 * track and the audio analyser are released on stop and when the page is left.
 */
export function useMediaCheck(): MediaCheck {
  const [status, setStatus] = useState<MediaStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hearing, setHearing] = useState(false)
  const cleanup = useRef<() => void>(() => undefined)

  const stop = useCallback(() => {
    cleanup.current()
    cleanup.current = () => undefined
    setStream(null)
    setHearing(false)
    setStatus('idle')
  }, [])

  // Release the devices when the page is left.
  useEffect(
    () => () => {
      cleanup.current()
    },
    [],
  )

  const start = useCallback(async () => {
    cleanup.current()
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    } catch (error) {
      setStatus(statusForError(error))
      return
    }

    let frame = 0
    let context: AudioContext | null = null
    let loud = false
    const release = () => {
      cancelAnimationFrame(frame)
      media.getTracks().forEach((t) => t.stop())
      void context?.close()
    }
    cleanup.current = release

    // If a device is unplugged mid-check, say so instead of showing a frozen picture.
    media.getTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        release()
        cleanup.current = () => undefined
        setStream(null)
        setHearing(false)
        setStatus('error')
      }),
    )

    try {
      context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(media).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let peak = 0
        for (const v of samples) peak = Math.max(peak, Math.abs(v - 128))
        const now = peak > 6
        if (now !== loud) {
          loud = now
          setHearing(now)
        }
        frame = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // No audio analysis available: the devices still work, the sound indicator just stays off.
    }

    setStream(media)
    setStatus('ready')
  }, [])

  return { status, stream, hearing, start, stop }
}
