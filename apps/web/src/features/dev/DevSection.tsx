import type { ReactNode } from 'react'

export function DevSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="border-t border-border py-6">
      <h2 id={id} className="mb-4 text-md font-semibold text-text">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function DevRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm text-text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}
