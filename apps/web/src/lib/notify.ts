import { toast } from 'sonner'

/**
 * Forms are fully built and validated, but there is nothing to save to yet. Say so, and never
 * pretend to succeed. It takes no arguments, so it can be passed straight to `handleSubmit` or
 * `onClick`, which call it with form values or an event.
 */
export function notifyUnavailable(): void {
  toast("Saving isn't available yet")
}

/** The same honesty for an action that is not saving, such as opening a resume. */
export function notifyFeatureUnavailable(what: string): void {
  toast(`${what} isn't available yet`)
}
