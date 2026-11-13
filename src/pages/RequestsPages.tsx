import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Check, Eye, Plus, X } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { api, messageFromError } from '../lib/api'
import type { Employee, LeaveBalance, LeaveRequest, Paginated, WfhRequest, WfhUsage } from '../lib/types'
import { employeeName, getList } from '../lib/types'
import { DataTable, type Column } from '../components/DataTable'
import { ConfirmDialog, ErrorState, FieldError, formatDate, Modal, PageHeader, SearchField, Spinner, StatusBadge } from '../components/ui'

type Request = LeaveRequest | WfhRequest
const leaveSchema = z.object({ employeeId: z.string().min(1, 'Select an employee'), type: z.string().min(1, 'Select a leave type'), startDate: z.string().min(1, 'Required'), endDate: z.string().min(1, 'Required'), reason: z.string().min(5, 'Add a short reason') }).refine(v => v.endDate >= v.startDate, { path: ['endDate'], message: 'End date must be after start date' })
const wfhSchema = z.object({ employeeId: z.string().min(1, 'Select an employee'), type: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional(), reason: z.string().max(1000).optional() })
type RequestValues = { employeeId: string; type?: string; startDate?: string; endDate?: string; reason?: string }

export function LeavePage() { return <RequestCenter kind="leave" /> }
export function WfhPage() { return <RequestCenter kind="wfh" /> }

function RequestCenter({ kind }: { kind: 'leave' | 'wfh' }) {
  const isLeave = kind === 'leave'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Request | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const deferredSearch = useDeferredValue(search)
  const client = useQueryClient()
  const query = useQuery({ queryKey: [kind, deferredSearch, status], queryFn: () => api.get<Paginated<Request> | Request[]>(`/${kind}`, { params: { search: deferredSearch || undefined, status: status || undefined } }).then(r => getList(r.data)) })
  const balances = useQuery({ queryKey: [kind, 'summary'], queryFn: () => api.get<LeaveBalance[] | WfhUsage>(`/${kind}/${isLeave ? 'balances' : 'usage'}`).then(r => r.data) })
  const actionMutation = useMutation({ mutationFn: ({ id, action: requestAction }: { id: string; action: string }) => api.post(`/${kind}/${id}/${requestAction}`, requestAction === 'reject' ? { rejectionReason } : undefined), onSuccess: (_, variables) => { toast.success(`Request ${variables.action}d`); client.invalidateQueries({ queryKey: [kind] }); setAction(null); setRejectionReason(''); setViewing(null) }, onError: error => toast.error(messageFromError(error)) })
  const beginAction = (request: Request, requestAction: 'approve' | 'reject' | 'cancel') => { setViewing(request); setAction(requestAction) }
  const columns: Column<Request>[] = [
    { key: 'employee', header: 'Employee', render: row => <div><p className="font-semibold">{employeeName(row.employee)}</p><p className="text-xs text-black/40">{row.employee.email}</p></div> },
    { key: 'type', header: isLeave ? 'Leave type' : 'Dates', render: row => isLeave ? (row as LeaveRequest).type : `${formatDate((row as WfhRequest).date)}${(row as WfhRequest).endDate ? ` – ${formatDate((row as WfhRequest).endDate)}` : ''}` },
    { key: 'dates', header: isLeave ? 'Dates' : 'Reason', render: row => isLeave ? `${formatDate((row as LeaveRequest).startDate)} – ${formatDate((row as LeaveRequest).endDate)}` : row.reason },
    { key: 'days', header: 'Days', render: row => isLeave ? (row as LeaveRequest).days : (row as WfhRequest).days || '—' },
    { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    { key: 'action', header: '', render: row => { const requestDate = isLeave ? (row as LeaveRequest).startDate : (row as WfhRequest).date; const upcoming = requestDate >= new Date().toISOString().slice(0, 10); return <div className="flex justify-end gap-1">{row.status === 'pending' && <><button aria-label="Reject request" title="Reject" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => beginAction(row, 'reject')}><X className="size-4" /></button><button aria-label="Approve request" title="Approve" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => beginAction(row, 'approve')}><Check className="size-4" /></button></>}{upcoming && (row.status === 'pending' || row.status === 'approved') && <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => beginAction(row, 'cancel')}>Cancel</button>}<button aria-label="View request" className="rounded-lg p-2 hover:bg-black/5" onClick={() => setViewing(row)}><Eye className="size-4" /></button></div> } },
  ]
  return <><PageHeader eyebrow="Time & flexibility" title={isLeave ? 'Leave requests' : 'Work from home'} description={isLeave ? 'Review requests, balances, and upcoming time away.' : 'Coordinate flexible work while keeping team limits visible.'} actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" /> New request</button>} />
    <Summary kind={kind} data={balances.data} loading={balances.isLoading} />
    <div className="card mb-4 mt-5 grid gap-3 p-4 sm:grid-cols-[1fr_200px]"><SearchField value={search} onChange={setSearch} placeholder="Search employee" /><select className="field" value={status} aria-label="Filter status" onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['pending', 'approved', 'rejected', 'cancelled'].map(item => <option key={item}>{item}</option>)}</select></div>
    <div className="card">{query.isLoading ? <Spinner label="Loading requests..." /> : query.isError ? <div className="p-4"><ErrorState message={messageFromError(query.error)} retry={() => query.refetch()} /></div> : <DataTable rows={query.data || []} columns={columns} keyOf={row => row.id} emptyTitle="No requests found" emptyMessage="New requests will appear here." />}</div>
    <RequestForm kind={kind} open={creating} close={() => setCreating(false)} />
    <RequestDetail request={viewing} kind={kind} close={() => setViewing(null)} act={setAction} />
    {action === 'reject' ? <Modal open onClose={() => { setAction(null); setRejectionReason('') }} title="Reject request"><label className="label">Rejection reason</label><textarea autoFocus className="field min-h-28" value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} /><div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setAction(null)}>Back</button><button className="btn-danger" disabled={rejectionReason.trim().length < 3 || actionMutation.isPending} onClick={() => viewing && actionMutation.mutate({ id: viewing.id, action: 'reject' })}>Reject request</button></div></Modal> : <ConfirmDialog open={!!action} title={`${action?.[0].toUpperCase()}${action?.slice(1)} request?`} message={action === 'cancel' ? 'This cancels the upcoming request. Approved leave will be credited back automatically.' : 'This immediately approves the request and updates the applicable balance or quota.'} confirmLabel={action || 'Confirm'} dangerous={action === 'cancel'} busy={actionMutation.isPending} onClose={() => setAction(null)} onConfirm={() => viewing && action && actionMutation.mutate({ id: viewing.id, action })} />}
  </>
}

function Summary({ kind, data, loading }: { kind: 'leave' | 'wfh'; data?: LeaveBalance[] | WfhUsage; loading: boolean }) {
  if (loading) return <div className="h-24 animate-pulse rounded-2xl bg-white" />
  if (kind === 'leave' && Array.isArray(data)) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.map(item => <div className="card p-4" key={item.type}><p className="text-xs font-bold uppercase tracking-wider text-black/45">{item.type}</p><p className="mt-2 font-display text-2xl">{item.remaining} <span className="font-sans text-xs text-black/40">of {item.allocated} days left</span></p><div className="mt-3 h-1.5 rounded-full bg-black/7"><div className="h-full rounded-full bg-clay" style={{ width: `${Math.min(100, item.allocated ? item.used / item.allocated * 100 : 0)}%` }} /></div></div>)}</div>
  const usage = data as WfhUsage | undefined
  return usage && <div className="card flex items-center gap-4 p-5"><span className={`grid size-11 place-items-center rounded-xl ${usage.used >= usage.limit ? 'bg-amber-100 text-amber-700' : 'bg-mint text-forest'}`}><AlertTriangle className="size-5" /></span><div><p className="font-semibold">{usage.used} of {usage.limit} remote days used</p><p className="text-sm text-black/45">{usage.period}{usage.used >= usage.limit ? ' · Limit reached' : ` · ${usage.limit - usage.used} remaining`}</p></div></div>
}

function RequestForm({ kind, open, close }: { kind: 'leave' | 'wfh'; open: boolean; close: () => void }) {
  const client = useQueryClient()
  const isLeave = kind === 'leave'
  const [wfhDates, setWfhDates] = useState([''])
  const employees = useQuery({ queryKey: ['employees', 'options'], enabled: open, queryFn: () => api.get<Paginated<Employee> | Employee[]>('/employees', { params: { status: 'active', page_size: 500 } }).then(r => getList(r.data)) })
  const leaveTypes = useQuery({ queryKey: ['leave-types'], enabled: open && isLeave, queryFn: () => api.get<Array<{ id: string; name: string }>>('/settings/leave-types').then(r => r.data) })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequestValues>({ resolver: zodResolver(isLeave ? leaveSchema : wfhSchema), defaultValues: { employeeId: '', type: '', startDate: '', endDate: '', reason: '' } })
  const mutation = useMutation({ mutationFn: (values: RequestValues) => api.post(`/${kind}`, isLeave ? values : { employeeId: values.employeeId, dates: wfhDates.filter(Boolean), reason: values.reason || undefined }), onSuccess: () => { toast.success('Request submitted'); client.invalidateQueries({ queryKey: [kind] }); reset(); setWfhDates(['']); close() }, onError: error => toast.error(messageFromError(error)) })
  return <Modal open={open} onClose={close} title={`New ${isLeave ? 'leave' : 'WFH'} request`}><form className="space-y-4" onSubmit={handleSubmit(values => mutation.mutate(values))}><div><label className="label">Employee</label><select className="field" {...register('employeeId')}><option value="">Select employee</option>{employees.data?.map(item => <option key={item.id} value={item.id}>{employeeName(item)}</option>)}</select><FieldError message={errors.employeeId?.message} /></div>{isLeave && <div><label className="label">Leave type</label><select className="field" {...register('type')}><option value="">Select type</option>{leaveTypes.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError message={errors.type?.message} /></div>}{isLeave ? <div className="grid grid-cols-2 gap-3"><div><label className="label">Start date</label><input type="date" className="field" {...register('startDate')} /><FieldError message={errors.startDate?.message} /></div><div><label className="label">End date</label><input type="date" className="field" {...register('endDate')} /><FieldError message={errors.endDate?.message} /></div></div> : <div><label className="label">WFH dates</label><div className="space-y-2">{wfhDates.map((date, index) => <div className="flex gap-2" key={index}><input required type="date" className="field" value={date} onChange={event => setWfhDates(wfhDates.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />{wfhDates.length > 1 && <button type="button" className="btn-secondary" onClick={() => setWfhDates(wfhDates.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div>)}</div><button type="button" className="mt-2 text-sm font-semibold text-forest" onClick={() => setWfhDates([...wfhDates, ''])}>+ Add another date</button><p className="mt-2 text-xs text-black/45">Tuesday–Thursday only. Dates cannot be consecutive or immediately follow a public holiday.</p></div>}<div><label className="label">Reason {isLeave ? '' : '(optional)'}</label><textarea className="field min-h-24 py-3" {...register('reason')} /><FieldError message={errors.reason?.message} /></div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={mutation.isPending || (!isLeave && wfhDates.some(date => !date))}>{mutation.isPending ? 'Submitting...' : 'Submit request'}</button></div></form></Modal>
}

function RequestDetail({ request, kind, close, act }: { request: Request | null; kind: string; close: () => void; act: (action: 'approve' | 'reject' | 'cancel') => void }) {
  if (!request) return null
  const leave = kind === 'leave' ? request as LeaveRequest : null
  const requestDate = leave?.startDate || (request as WfhRequest).date
  const upcoming = requestDate >= new Date().toISOString().slice(0, 10)
  return <Modal open onClose={close} title="Request details"><div className="space-y-4"><div className="flex items-center justify-between"><div><p className="font-semibold">{employeeName(request.employee)}</p><p className="text-sm text-black/45">{request.employee.email}</p></div><StatusBadge status={request.status} /></div><dl className="grid grid-cols-2 gap-4 rounded-xl bg-white p-4"><div><dt className="label">Start</dt><dd className="text-sm">{formatDate(requestDate)}</dd></div><div><dt className="label">End</dt><dd className="text-sm">{formatDate(leave?.endDate || (request as WfhRequest).endDate)}</dd></div>{leave && <div><dt className="label">Type</dt><dd className="text-sm">{leave.type}</dd></div>}</dl><div><p className="label">Reason</p><p className="text-sm leading-6">{request.reason || 'No reason provided'}</p></div><div className="flex flex-wrap justify-end gap-2 pt-3">{request.status === 'pending' && <><button className="btn-secondary !text-red-600" onClick={() => act('reject')}>Reject</button><button className="btn-primary" onClick={() => act('approve')}>Approve</button></>}{upcoming && (request.status === 'pending' || request.status === 'approved') && <button className="btn-secondary" onClick={() => act('cancel')}>Cancel request</button>}</div></div></Modal>
}
