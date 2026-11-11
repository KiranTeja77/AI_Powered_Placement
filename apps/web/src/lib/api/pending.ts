/**
 * Hooks for screens whose backend does not exist yet. They return an empty result immediately and
 * make NO network call, so every such screen renders its designed empty state. When an endpoint is
 * built, replace the hook with a real TanStack Query hook of the same shape.
 *
 * Never put sample data here: empty means empty.
 */

export interface PendingQuery<T> {
  data: T
  isLoading: false
  isError: false
  refetch: () => void
}

export interface Page<T> {
  items: T[]
  total: number
}

function empty<T>(data: T): PendingQuery<T> {
  return { data, isLoading: false, isError: false, refetch: () => undefined }
}

/** A list that has no records yet. */
export function usePendingList<T>(): PendingQuery<T[]> {
  return empty<T[]>([])
}

/** A single record that does not exist yet. */
export function usePendingItem<T>(): PendingQuery<T | null> {
  return empty<T | null>(null)
}

/** A paginated result with no records yet. */
export function usePendingPage<T>(): PendingQuery<Page<T>> {
  return empty<Page<T>>({ items: [], total: 0 })
}

// Intended endpoints for the screens that use the hooks above. Each is a TODO(api) until built.
// TODO(api): GET /api/v1/student/overview            -> StudentOverview
// TODO(api): GET /api/v1/student/assessments         -> Page<Assessment>
// TODO(api): GET /api/v1/student/drives              -> Page<Drive>
// TODO(api): GET /api/v1/faculty/students            -> Page<MentoredStudent>
// TODO(api): GET /api/v1/tp/drives                   -> Page<Drive>
// TODO(api): GET /api/v1/notifications               -> Page<Notification>
