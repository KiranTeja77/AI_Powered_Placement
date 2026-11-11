import { toast } from 'sonner'

/**
 * Forms are fully built and validated, but there is nothing to save to yet. Say so, and never
 * pretend to succeed.
 */
export function notifyUnavailable(): void {
  toast("Saving isn't available yet")
}
