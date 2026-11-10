import type { ColumnDef } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ChartCard } from '@/components/ChartCard'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Inbox } from 'lucide-react'

interface Row {
  name: string
}
const columns: ColumnDef<Row, unknown>[] = [{ accessorKey: 'name', header: 'Name' }]
const empty = <EmptyState icon={Inbox} title="Nothing here" description="Records appear here." />

describe('StatCard', () => {
  it('shows an em dash without a value', () => {
    render(<StatCard label="Placed" />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the value when present', () => {
    render(<StatCard label="Placed" value={12} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})

describe('ChartCard', () => {
  it('renders the empty state instead of the chart when there is no data', () => {
    render(
      <ChartCard title="Trend" dataCount={0}>
        <div data-testid="chart" />
      </ChartCard>,
    )
    expect(screen.getByText('No data yet')).toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('always renders a text label', () => {
    render(<StatusBadge tone="danger" label="Not eligible" />)
    expect(screen.getByText('Not eligible')).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('renders breadcrumb, title and description', () => {
    render(
      <MemoryRouter>
        <PageHeader
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Drives' }]}
          title="Drives"
          description="Campus recruitment drives."
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByText('Campus recruitment drives.')).toBeInTheDocument()
  })
})

describe('DataTable', () => {
  it('shows the empty node with no rows', () => {
    render(<DataTable columns={columns} data={[]} empty={empty} />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('shows loading and error states', async () => {
    const { rerender } = render(<DataTable columns={columns} data={[]} loading empty={empty} />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    const onRetry = vi.fn()
    rerender(<DataTable columns={columns} data={[]} error onRetry={onRetry} empty={empty} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('filters rows with the search box', async () => {
    const data = [{ name: 'Alpha' }, { name: 'Beta' }]
    render(<DataTable columns={columns} data={data} empty={empty} searchLabel="Search rows" />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Search rows' }), 'Alp')
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })
})
