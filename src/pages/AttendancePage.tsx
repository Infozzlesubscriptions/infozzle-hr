import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Eye } from 'lucide-react'
import { api, messageFromError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { employeeName, getList, isAdminRole, type AttendancePunch, type AttendanceRecord, type AttendanceSyncRun, type Employee, type Paginated } from '../lib/types'
import { DataTable, type Column } from '../components/DataTable'
import { ErrorState, Modal, PageHeader, SearchField, Spinner } from '../components/ui'

const istDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

const daysBefore = (ymd: string, days: number) => {
  const date = new Date(`${ymd}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export const formatAttendanceTime = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—'

export const formatWorkedTime = (minutes?: number | null) => minutes == null ? '—' : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`

const statusStyle = (status: string) => {
  const key = status.toLowerCase()
  if (key === 'present') return 'bg-emerald-100 text-emerald-800'
  if (key === 'wfh') return 'bg-blue-100 text-blue-800'
  if (key === 'leave') return 'bg-violet-100 text-violet-800'
  if (key === 'absent' || key === 'missing punch') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-800'
}

export function AttendanceStatus({ status }: { status: string }) {
  return <span className={`pill ${statusStyle(status)}`}>{status}</span>
}

export function AttendanceTable({ records, showEmployee = true, onViewPunches }: { records: AttendanceRecord[]; showEmployee?: boolean; onViewPunches?: (record: AttendanceRecord) => void }) {
  const columns: Column<AttendanceRecord>[] = [
    ...(showEmployee ? [{ key: 'employee', header: 'Employee', render: (row: AttendanceRecord) => <div><p className="font-semibold">{row.employee ? employeeName(row.employee) : 'Unmatched employee'}</p><p className="text-xs text-black/45">EmpCode {row.etimeOfficeId}</p></div> }] : []),
    { key: 'date', header: 'Date', render: row => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${row.date}T00:00:00Z`)) },
    { key: 'in', header: 'IN', render: row => <span className="font-semibold">{formatAttendanceTime(row.inTime)}</span> },
    { key: 'out', header: 'OUT', render: row => <span className="font-semibold">{formatAttendanceTime(row.outTime)}</span> },
    { key: 'worked', header: 'Worked', render: row => formatWorkedTime(row.workMinutes) },
    { key: 'status', header: 'Status', render: row => <AttendanceStatus status={row.status} /> },
    ...(onViewPunches ? [{ key: 'punches', header: '', className: 'text-right', render: (row: AttendanceRecord) => <button className="rounded-lg p-2 hover:bg-black/5" title="View all punches" aria-label={`View punches for ${row.date}`} onClick={() => onViewPunches(row)}><Eye className="size-4" /></button> }] : []),
  ]
  return <DataTable rows={records} columns={columns} keyOf={row => row.id} emptyTitle="No attendance records" emptyMessage="No eTimeOffice attendance was found for the selected filters." />
}

export function AttendancePage() {
  const { user } = useAuth()
  const admin = isAdminRole(user?.role)
  const today = istDate()
  const [from, setFrom] = useState(daysBefore(today, 6))
  const [to, setTo] = useState(today)
  const [employeeId, setEmployeeId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AttendanceRecord | null>(null)
  const deferredSearch = useDeferredValue(search)
  const employees = useQuery({ queryKey: ['employees', 'attendance-options'], enabled: admin, queryFn: () => api.get<Paginated<Employee> | Employee[]>('/employees', { params: { status: 'active', limit: 100 } }).then(response => getList(response.data)) })
  const attendance = useQuery({ queryKey: ['attendance', from, to, employeeId, status, deferredSearch], queryFn: () => api.get<AttendanceRecord[]>('/attendance', { params: { from, to, employeeId: employeeId || undefined, status: status || undefined, search: deferredSearch || undefined } }).then(response => response.data) })
  const latestSync = useQuery({ queryKey: ['attendance', 'sync-status'], queryFn: () => api.get<AttendanceSyncRun | null>('/attendance/sync-status').then(response => response.data), refetchInterval: 60_000 })
  return <>
    <PageHeader eyebrow="Biometric records" title="Attendance" description="Daily IN and OUT times synchronized from eTimeOffice. Times are shown in India Standard Time." />
    <SyncSummary sync={latestSync.data} />
    <div className={`card mb-4 grid gap-3 p-4 ${admin ? 'md:grid-cols-[1fr_190px_190px_190px_170px]' : 'md:grid-cols-[1fr_190px_190px_170px]'}`}>
      <SearchField value={search} onChange={setSearch} placeholder="Search employee or EmpCode" />
      {admin && <select className="field" aria-label="Filter employee" value={employeeId} onChange={event => setEmployeeId(event.target.value)}><option value="">All employees</option>{employees.data?.map(employee => <option key={employee.id} value={employee.id}>{employeeName(employee)}</option>)}</select>}
      <input aria-label="From date" className="field" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} />
      <input aria-label="To date" className="field" type="date" value={to} min={from} onChange={event => setTo(event.target.value)} />
      <select className="field" aria-label="Filter attendance status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{['Present', 'Absent', 'Missing punch', 'Provisional', 'WFH', 'Leave'].map(item => <option key={item}>{item}</option>)}</select>
    </div>
    <div className="card">{attendance.isLoading ? <Spinner label="Loading attendance..." /> : attendance.isError ? <div className="p-4"><ErrorState message={messageFromError(attendance.error)} retry={() => attendance.refetch()} /></div> : <AttendanceTable records={attendance.data || []} showEmployee={admin} onViewPunches={setSelected} />}</div>
    <PunchesModal record={selected} close={() => setSelected(null)} />
  </>
}

function SyncSummary({ sync }: { sync?: AttendanceSyncRun | null }) {
  if (!sync) return <div className="card mb-4 p-4 text-sm text-black/55">Attendance has not been synchronized yet.</div>
  const successful = sync.status === 'SUCCEEDED'
  return <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${successful ? 'bg-emerald-100 text-emerald-700' : sync.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}><Clock className="size-5" /></span><div><p className="text-sm font-semibold">Last sync: {sync.status.toLowerCase()}</p><p className="text-xs text-black/45">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(sync.finishedAt || sync.startedAt))} · {sync.dailyRowsFetched} daily rows · {sync.rawPunchesFetched} punches</p></div></div>{sync.errorMessage && <p className="text-xs text-red-600">{sync.errorMessage}</p>}</div>
}

function PunchesModal({ record, close }: { record: AttendanceRecord | null; close: () => void }) {
  const punches = useQuery({ queryKey: ['attendance', record?.id, 'punches'], enabled: !!record, queryFn: () => api.get<AttendancePunch[]>(`/attendance/${record!.id}/punches`).then(response => response.data) })
  return <Modal open={!!record} onClose={close} title={`Punches · ${record?.date || ''}`}><div className="mb-4 rounded-xl bg-white p-4"><p className="font-semibold">{record?.employee ? employeeName(record.employee) : `EmpCode ${record?.etimeOfficeId}`}</p><p className="mt-1 text-sm text-black/50">IN {formatAttendanceTime(record?.inTime)} · OUT {formatAttendanceTime(record?.outTime)} · {formatWorkedTime(record?.workMinutes)}</p></div>{punches.isLoading ? <Spinner label="Loading punches..." /> : punches.isError ? <ErrorState message={messageFromError(punches.error)} retry={() => punches.refetch()} /> : punches.data?.length ? <div className="space-y-2">{punches.data.map((punch, index) => <div key={punch.id} className="flex items-center justify-between rounded-xl border border-black/8 bg-white p-3"><span className="text-sm font-semibold">Punch {index + 1}</span><span className="text-sm">{formatAttendanceTime(punch.punchAt)}</span></div>)}</div> : <p className="py-8 text-center text-sm text-black/45">No raw punches recorded for this date.</p>}</Modal>
}
