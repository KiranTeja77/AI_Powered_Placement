import { Mic, TriangleAlert, VideoOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { MEDIA_MESSAGES, type MediaCheck } from './useMediaCheck'

/**
 * Camera and microphone check. The picture and the sound indicator stay on this device: nothing is
 * recorded, stored or sent. The text says so, because a camera light with no explanation is
 * alarming.
 */
export function DeviceCheck({ check }: { check: MediaCheck }) {
  const { status, stream, hearing, start, stop } = check
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (video.current) video.current.srcObject = stream
  }, [stream])

  const failed = status !== 'idle' && status !== 'requesting' && status !== 'ready'

  return (
    <div className="space-y-3 p-4">
      <p className="text-base text-text">
        Check that your camera and microphone work. The preview stays on this device. Nothing is
        recorded or sent.
      </p>

      {status === 'ready' ? (
        <div className="grid gap-3 sm:grid-cols-[240px_1fr] sm:items-start">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Camera preview"
            className="aspect-video w-full rounded-md border border-border bg-surface-muted"
          />
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-base text-text">
              <Mic className="size-4 text-text-muted" aria-hidden="true" />
              {hearing ? 'Microphone is picking up sound' : 'Say something to test the microphone'}
            </p>
            <p role="status" className="text-sm text-text-muted">
              Camera and microphone are working.
            </p>
            <Button variant="secondary" size="sm" onClick={stop}>
              Turn off preview
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void start()}
            disabled={status === 'requesting'}
          >
            {status === 'requesting'
              ? 'Waiting for permission'
              : failed
                ? 'Try again'
                : 'Check camera and microphone'}
          </Button>
        </div>
      )}

      {failed && (
        <p role="alert" className="flex items-start gap-2 text-base text-danger">
          {status === 'no-device' ? (
            <VideoOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          {MEDIA_MESSAGES[status]}
        </p>
      )}
    </div>
  )
}
