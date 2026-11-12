import type { ReactNode } from 'react'
import { EmptyState } from './ui'

export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode; className?: string }
export function DataTable<T>({ rows, columns, keyOf, emptyTitle = 'No records found', emptyMessage = 'Try changing your filters or add a new record.' }: { rows: T[]; columns: Column<T>[]; keyOf: (row: T) => string; emptyTitle?: string; emptyMessage?: string }) {
  if (!rows.length) return <EmptyState title={emptyTitle} message={emptyMessage} />
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-black/8 text-xs uppercase tracking-wider text-black/45">{columns.map(column => <th key={column.key} className={`px-4 py-3 font-bold ${column.className || ''}`}>{column.header}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={keyOf(row)} className="border-b border-black/6 transition hover:bg-mint/25 last:border-0">{columns.map(column => <td key={column.key} className={`px-4 py-4 ${column.className || ''}`}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>
}
