import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'

export interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  breadcrumbs?: Crumb[]
  title: string
  description?: string
  /** At most one primary action, right-aligned. */
  action?: ReactNode
}

export function PageHeader({ breadcrumbs, title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-text-muted">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1
              return (
                <Fragment key={`${crumb.label}-${i}`}>
                  <li>
                    {crumb.to && !last ? (
                      <Link to={crumb.to} className="hover:text-text hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
                    )}
                  </li>
                  {!last && (
                    <li aria-hidden="true" className="text-text-muted">
                      /
                    </li>
                  )}
                </Fragment>
              )
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-text">{title}</h1>
          {description && <p className="mt-1 text-base text-text-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  )
}
