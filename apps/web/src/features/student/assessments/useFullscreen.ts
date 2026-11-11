import { useCallback, useEffect, useState } from 'react'

export interface FullscreenControl {
  supported: boolean
  active: boolean
  /** Set when the browser refused to enter full screen. */
  error: string | null
  enter: () => Promise<void>
  exit: () => Promise<void>
}

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

/** Tracks and controls full-screen mode for the whole page. */
export function useFullscreen(): FullscreenControl {
  const [active, setActive] = useState(() => document.fullscreenElement !== null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const update = () => setActive(document.fullscreenElement !== null)
    update()
    return subscribe(update)
  }, [])

  const enter = useCallback(async () => {
    setError(null)
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      setError('Your browser did not allow full screen. Try again, or press F11.')
    }
  }, [])

  const exit = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
  }, [])

  return { supported: document.fullscreenEnabled, active, error, enter, exit }
}
