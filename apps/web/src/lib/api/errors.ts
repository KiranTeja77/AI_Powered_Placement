/** An RFC 9457 problem+json response, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  readonly fieldErrors: Record<string, string>
  readonly retryAfterSeconds: number | null

  constructor(init: {
    status: number
    message: string
    code?: string | null
    fieldErrors?: Record<string, string>
    retryAfterSeconds?: number | null
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code ?? null
    this.fieldErrors = init.fieldErrors ?? {}
    this.retryAfterSeconds = init.retryAfterSeconds ?? null
  }
}

interface ProblemBody {
  detail?: unknown
  code?: unknown
  errors?: unknown
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((v) => typeof v === 'string')
  )
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: ProblemBody = {}
  try {
    body = (await response.json()) as ProblemBody
  } catch {
    /* not JSON: fall through to the generic message */
  }
  const retryAfter = Number(response.headers.get('Retry-After'))
  return new ApiError({
    status: response.status,
    message: typeof body.detail === 'string' ? body.detail : 'Something went wrong. Try again.',
    code: typeof body.code === 'string' ? body.code : null,
    fieldErrors: isStringRecord(body.errors) ? body.errors : {},
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  })
}

/** Copies server field errors onto a form; returns true when any field was matched. */
export function applyFieldErrors<T extends string>(
  error: unknown,
  fields: readonly T[],
  setError: (name: T, error: { type: string; message: string }) => void,
): boolean {
  if (!(error instanceof ApiError)) return false
  let matched = false
  for (const field of fields) {
    const message = error.fieldErrors[field]
    if (message) {
      setError(field, { type: 'server', message })
      matched = true
    }
  }
  return matched
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429 && error.retryAfterSeconds) {
      const minutes = Math.max(1, Math.ceil(error.retryAfterSeconds / 60))
      return `Too many attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
    }
    return error.message
  }
  return 'Something went wrong. Try again.'
}
