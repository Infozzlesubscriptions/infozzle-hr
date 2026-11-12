import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api, downloadFile, messageFromError } from '../lib/api'
import type { Department, Paginated } from '../lib/types'
import { getList } from '../lib/types'
import { PageHeader } from '../components/ui'

const reports = [{ id: 'headcount', title: 'Headcount', description: 'Current workforce by department, role, and status.' }, { id: 'attendance', title: 'Attendance', description: 'Leave and remote work activity over time.' }, { id: 'leave-balances', title: 'Leave balances', description: 'Allocated, used, and remaining balances.' }, { id: 'onboarding', title: 'Onboarding progress', description: 'Task completion and overdue milestones.' }]

export function ReportsPage() {
  const [department, setDepartment] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api.get<Paginated<Department> | Department[]>('/departments').then(r => getList(r.data)) })
  const download = useMutation({ mutationFn: (id: string) => downloadFile(`/reports/${id}`, `${id}.csv`, { format: 'csv', department, from, to }), onSuccess: () => toast.success('Report downloaded'), onError: error => toast.error(messageFromError(error)) })
  return <><PageHeader eyebrow="Evidence, not instinct" title="Reports" description="Generate focused exports for leadership and operational reviews." />
    <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3"><select className="field" value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{departments.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="From date" type="date" className="field" value={from} onChange={e => setFrom(e.target.value)} /><input aria-label="To date" type="date" className="field" value={to} onChange={e => setTo(e.target.value)} /></div>
    <div className="grid gap-4 md:grid-cols-2">{reports.map(report => <article className="card flex items-start gap-4 p-5" key={report.id}><span className="rounded-xl bg-mint p-3 text-forest"><FileSpreadsheet className="size-5" /></span><div className="flex-1"><h2 className="font-display text-xl font-semibold">{report.title}</h2><p className="mt-1 text-sm leading-6 text-black/50">{report.description}</p><div className="mt-4"><button className="btn-secondary" disabled={download.isPending} onClick={() => download.mutate(report.id)}><Download className="size-4" /> CSV</button></div></div></article>)}</div>
  </>
}
