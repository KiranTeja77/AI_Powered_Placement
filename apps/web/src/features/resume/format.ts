const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

/** 47.1 becomes "47.1%". One decimal, the same as the API's score. */
export function formatPercent(score: number): string {
  return `${score.toFixed(1)}%`
}

/** Points are kept to one decimal and drop a trailing ".0". */
export function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
