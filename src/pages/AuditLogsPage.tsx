import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useState } from 'react'
import { api, messageFromError } from '../lib/api'
import type { AuditLog, Paginated } from '../lib/types'
import { getList } from '../lib/types'
import { DataTable, type Column } from '../components/DataTable'
import { ErrorState, formatDateTime, PageHeader, SearchField, Spinner } from '../components/ui'

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const deferred = useDeferredValue(search)
  const query = useQuery({ queryKey: ['audit-logs', deferred, action], queryFn: () => api.get<Paginated<AuditLog> | AuditLog[]>('/audit-logs', { params: { search: deferred || undefined, action: action || undefined } }).then(r => getList(r.data)) })
  const columns: Column<AuditLog>[] = [{ key: 'time', header: 'Time', render: row => formatDateTime(row.createdAt) }, { key: 'actor', header: 'Actor', render: row => <div><p className="font-semibold">{row.actor?.name || 'System'}</p><p className="text-xs text-black/40">{row.actor?.email}</p></div> }, { key: 'action', header: 'Action', render: row => <span className="pill bg-mint text-forest">{row.action}</span> }, { key: 'entity', header: 'Resource', render: row => `${row.entity}${row.entityId ? ` #${row.entityId}` : ''}` }, { key: 'details', header: 'Details', render: row => <span className="block max-w-xs truncate text-xs text-black/45">{row.metadata ? JSON.stringify(row.metadata) : '—'}</span> }]
  return <><PageHeader eyebrow="Accountability" title="Audit logs" description="A read-only record of important administrative activity." />
    <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_220px]"><SearchField value={search} onChange={setSearch} placeholder="Search actor or resource" /><select className="field" value={action} onChange={e => setAction(e.target.value)}><option value="">All actions</option><option value="create">Create</option><option value="update">Update</option><option value="approve">Approve</option><option value="reject">Reject</option><option value="delete">Delete</option></select></div>
    <div className="card">{query.isLoading ? <Spinner /> : query.isError ? <div className="p-4"><ErrorState message={messageFromError(query.error)} /></div> : <DataTable rows={query.data || []} columns={columns} keyOf={row => row.id} emptyTitle="No activity found" emptyMessage="Audit events will appear here." />}</div>
  </>
}
