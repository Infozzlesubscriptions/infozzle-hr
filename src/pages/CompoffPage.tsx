import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, messageFromError } from '../lib/api'
import type { CompoffBalance, CompoffRequest, Employee, Paginated } from '../lib/types'
import { employeeName, getList, isAdminRole } from '../lib/types'
import { useAuth } from '../lib/auth'
import { DataTable, type Column } from '../components/DataTable'
import { ConfirmDialog, ErrorState, FieldError, formatDate, Modal, PageHeader, SearchField, Spinner, StatusBadge } from '../components/ui'

export function CompoffPage() {
  const { user } = useAuth()
  const isAdmin = isAdminRole(user?.role)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<CompoffRequest | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | 'delete' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const deferredSearch = useDeferredValue(search)
  const client = useQueryClient()
  const requests = useQuery({ queryKey: ['compoff', deferredSearch, status], queryFn: () => api.get<Paginated<CompoffRequest> | CompoffRequest[]>('/compoff', { params: { search: deferredSearch || undefined, status: status || undefined } }).then(r => getList(r.data)) })
  const balances = useQuery({ queryKey: ['compoff', 'balances'], queryFn: () => api.get<CompoffBalance[]>('/compoff/balances').then(r => r.data) })
  const mutation = useMutation({
    mutationFn: ({ id, action: requestedAction }: { id: string; action: 'approve' | 'reject' | 'delete' }) => requestedAction === 'delete' ? api.delete(`/compoff/${id}`) : api.post(`/compoff/${id}/${requestedAction}`, requestedAction === 'reject' ? { rejectionReason } : undefined),
    onSuccess: (_, variables) => { toast.success(variables.action === 'delete' ? 'Request deleted' : `Request ${variables.action}d`); client.invalidateQueries({ queryKey: ['compoff'] }); setAction(null); setSelected(null); setRejectionReason('') },
    onError: error => toast.error(messageFromError(error)),
  })
  const begin = (row: CompoffRequest, nextAction: 'approve' | 'reject' | 'delete') => { setSelected(row); setAction(nextAction) }
  const columns: Column<CompoffRequest>[] = [
    { key: 'employee', header: 'Employee', render: row => <div><p className="font-semibold">{employeeName(row.employee)}</p><p className="text-xs text-black/40">{row.employee.email}</p></div> },
    { key: 'workDate', header: 'Worked on', render: row => formatDate(row.workDate) },
    { key: 'hours', header: 'Hours', render: row => <span className="font-semibold">{row.hours}</span> },
    { key: 'conversion', header: 'Converted', render: row => row.creditedLeaveDays ? `${row.creditedLeaveDays} leave day${row.creditedLeaveDays === 1 ? '' : 's'}` : '—' },
    { key: 'reason', header: 'Reason', render: row => row.reason || '—' },
    { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', render: row => <div className="flex justify-end gap-1">{isAdmin && row.status === 'pending' && <><button aria-label="Reject request" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => begin(row, 'reject')}><X className="size-4" /></button><button aria-label="Approve request" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => begin(row, 'approve')}><Check className="size-4" /></button></>}{isAdmin && row.status !== 'approved' && <button aria-label="Delete request" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => begin(row, 'delete')}><Trash2 className="size-4" /></button>}</div> },
  ]
  return <><PageHeader eyebrow="Earned time" title="Comp-off" description="Track eligible weekend and holiday hours. Every eight approved hours automatically becomes one leave day." actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" /> New request</button>} />
    <BalanceCards balances={balances.data || []} loading={balances.isLoading} />
    <div className="card mb-4 mt-5 grid gap-3 p-4 sm:grid-cols-[1fr_200px]"><SearchField value={search} onChange={setSearch} placeholder="Search employee" /><select className="field" value={status} aria-label="Filter status" onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['pending', 'approved', 'rejected'].map(item => <option key={item}>{item}</option>)}</select></div>
    <div className="card">{requests.isLoading ? <Spinner label="Loading requests..." /> : requests.isError ? <div className="p-4"><ErrorState message={messageFromError(requests.error)} retry={() => requests.refetch()} /></div> : <DataTable rows={requests.data || []} columns={columns} keyOf={row => row.id} emptyTitle="No comp-off requests" emptyMessage="Eligible weekend and holiday work requests will appear here." />}</div>
    <CreateCompoff open={creating} close={() => setCreating(false)} />
    {action === 'reject' ? <Modal open onClose={() => setAction(null)} title="Reject comp-off request"><label className="label">Reason</label><textarea autoFocus className="field min-h-28" value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} /><div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setAction(null)}>Back</button><button className="btn-danger" disabled={rejectionReason.trim().length < 3 || mutation.isPending} onClick={() => selected && mutation.mutate({ id: selected.id, action: 'reject' })}>Reject request</button></div></Modal> : <ConfirmDialog open={!!action} title={action === 'approve' ? 'Approve comp-off hours?' : 'Delete comp-off request?'} message={action === 'approve' ? 'Approved hours will be added to the employee balance and complete eight-hour blocks will immediately become leave.' : 'This permanently removes the request.'} confirmLabel={action || 'Confirm'} dangerous={action === 'delete'} busy={mutation.isPending} onClose={() => setAction(null)} onConfirm={() => selected && action && mutation.mutate({ id: selected.id, action })} />}
  </>
}

function BalanceCards({ balances, loading }: { balances: CompoffBalance[]; loading: boolean }) {
  if (loading) return <div className="h-24 animate-pulse rounded-2xl bg-white" />
  if (!balances.length) return <div className="card mt-5 p-5 text-sm text-black/45">No approved comp-off hours yet.</div>
  return <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{balances.map(item => <div className="card p-4" key={item.employee.id}><p className="font-semibold">{employeeName(item.employee as Employee)}</p><p className="mt-2 font-display text-2xl">{item.hours} <span className="font-sans text-xs text-black/40">hours available</span></p><p className="mt-1 text-xs text-black/45">{item.convertedLeaveDays} leave day(s) converted</p></div>)}</div>
}

function CreateCompoff({ open, close }: { open: boolean; close: () => void }) {
  const { user } = useAuth()
  const isAdmin = isAdminRole(user?.role)
  const client = useQueryClient()
  const [employeeId, setEmployeeId] = useState(isAdmin ? '' : user?.employeeId || '')
  const [workDate, setWorkDate] = useState('')
  const [hours, setHours] = useState('')
  const [reason, setReason] = useState('')
  const employees = useQuery({ queryKey: ['employees', 'options'], enabled: open && isAdmin, queryFn: () => api.get<Paginated<Employee> | Employee[]>('/employees', { params: { status: 'active', limit: 100 } }).then(r => getList(r.data)) })
  const mutation = useMutation({ mutationFn: () => api.post('/compoff', { employeeId, workDate, hours: Number(hours), reason: reason || undefined }), onSuccess: () => { toast.success('Comp-off request submitted'); client.invalidateQueries({ queryKey: ['compoff'] }); setWorkDate(''); setHours(''); setReason(''); close() }, onError: error => toast.error(messageFromError(error)) })
  const invalidHours = !hours || Number(hours) <= 0 || !Number.isFinite(Number(hours))
  return <Modal open={open} onClose={close} title="New comp-off request"><form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!invalidHours && employeeId && workDate) mutation.mutate() }}>{isAdmin && <div><label className="label">Employee</label><select required className="field" value={employeeId} onChange={event => setEmployeeId(event.target.value)}><option value="">Select employee</option>{employees.data?.map(employee => <option key={employee.id} value={employee.id}>{employeeName(employee)}</option>)}</select></div>}<div><label className="label">Date worked</label><input required type="date" className="field" value={workDate} onChange={event => setWorkDate(event.target.value)} /><p className="mt-1 text-xs text-black/45">Only weekends and configured company holidays are eligible.</p></div><div><label className="label">Hours worked</label><input required min="0.01" step="0.01" type="number" className="field" value={hours} onChange={event => setHours(event.target.value)} /><FieldError message={invalidHours && hours ? 'Enter hours greater than zero' : undefined} /></div><div><label className="label">Reason or work performed</label><textarea className="field min-h-24" maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={mutation.isPending || invalidHours}>Submit request</button></div></form></Modal>
}
