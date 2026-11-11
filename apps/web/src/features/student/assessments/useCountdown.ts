import { useEffect, useRef, useState } from 'react'

/**
 * Seconds left until a deadline fixed when the hook first runs. It reads the clock each tick
 * instead of counting ticks, so a throttled background tab cannot make the timer run slow.
 * `onExpire` runs once when the time reaches zero.
 */
export function useCountdown(totalSeconds: number, onExpire: () => void): number {
  const [deadline] = useState(() => Date.now() + totalSeconds * 1000)
  const [left, setLeft] = useState(totalSeconds)
  const expire = useRef(onExpire)
  const fired = useRef(false)

  useEffect(() => {
    expire.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0 && !fired.current) {
        fired.current = true
        expire.current()
      }
    }
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  return left
}
