import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { ErrorState } from '@/components/ErrorState'
import { FilterBar } from '@/components/FilterBar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Right-aligned with tabular figures. */
    numeric?: boolean
  }
}

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  /** Rendered when there are no rows at all. */
  empty: ReactNode
  searchLabel?: string
  searchPlaceholder?: string
  /** Extra filter controls shown beside the search box. */
  filters?: ReactNode
  pageSize?: number
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  onRetry,
  empty,
  searchLabel,
  searchPlaceholder,
  filters,
  pageSize = 10,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  // TanStack Table returns unmemoizable functions; this is expected and safe here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  const rows = table.getRowModel().rows
  const headerGroups = table.getHeaderGroups()
  const showToolbar = data.length > 0 || Boolean(filters)

  let body: ReactNode
  if (loading) {
    body = (
      <div className="space-y-px p-3" role="status" aria-label="Loading">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  } else if (error) {
    body = <ErrorState onRetry={onRetry} />
  } else if (data.length === 0) {
    body = empty
  } else if (rows.length === 0) {
    body = <p className="px-4 py-10 text-base text-text-muted">No results match your search.</p>
  } else {
    body = (
      <>
        {/* 768px and up: a regular table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              {headerGroups.map((group) => (
                <TableRow key={group.id} className="hover:bg-surface-muted">
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted()
                    const numeric = header.column.columnDef.meta?.numeric
                    return (
                      <TableHead
                        key={header.id}
                        data-numeric={numeric}
                        aria-sort={
                          sorted === 'asc'
                            ? 'ascending'
                            : sorted === 'desc'
                              ? 'descending'
                              : undefined
                        }
                      >
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-text"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="size-3.5" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} data-numeric={cell.column.columnDef.meta?.numeric}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Below 768px: stacked rows */}
        <ul className="divide-y divide-border md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="space-y-1 px-3 py-3">
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header
                return (
                  <div key={cell.id} className="flex justify-between gap-3 text-base">
                    {typeof header === 'string' && (
                      <span className="text-text-muted">{header}</span>
                    )}
                    <span className="text-right">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                )
              })}
            </li>
          ))}
        </ul>
        <DataTablePagination
          page={table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          total={table.getFilteredRowModel().rows.length}
          onPrevious={() => table.previousPage()}
          onNext={() => table.nextPage()}
        />
      </>
    )
  }

  return (
    <div className="rounded-md border border-border bg-surface">
      {showToolbar && !loading && !error && (
        <FilterBar
          search={globalFilter}
          onSearchChange={setGlobalFilter}
          searchLabel={searchLabel}
          searchPlaceholder={searchPlaceholder}
        >
          {filters}
        </FilterBar>
      )}
      {body}
    </div>
  )
}
