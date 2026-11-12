import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api, messageFromError } from '../lib/api'
import type { Employee, OnboardingRecord, Paginated } from '../lib/types'
import { employeeName, getList } from '../lib/types'
import { ErrorState, formatDate, Modal, PageHeader, Spinner, StatusBadge } from '../components/ui'

export function OnboardingPage() {
  const [selected, setSelected] = useState<OnboardingRecord | null>(null)
  const [create, setCreate] = useState(false)
  const query = useQuery({ queryKey: ['onboarding'], queryFn: () => api.get<Paginated<OnboardingRecord> | OnboardingRecord[]>('/onboarding').then(r => getList(r.data)) })
  return <><PageHeader eyebrow="First impressions" title="Onboarding" description="Give every new colleague a clear, confident start." actions={<button className="btn-primary" onClick={() => setCreate(true)}><Plus className="size-4" /> Start onboarding</button>} />
    {query.isLoading ? <Spinner /> : query.isError ? <ErrorState message={messageFromError(query.error)} retry={() => query.refetch()} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data?.map(record => <button key={record.id} onClick={() => setSelected(record)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><div><p className="font-semibold">{employeeName(record.employee)}</p><p className="mt-1 text-xs text-black/45">Starts {formatDate(record.startDate)}</p></div><StatusBadge status={record.status} /></div><div className="mt-6 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-black/7"><div className="h-full rounded-full bg-forest" style={{ width: `${record.progress}%` }} /></div><span className="text-sm font-bold">{record.progress}%</span><ChevronRight className="size-4 text-black/35" /></div></button>)}</div>}
    <OnboardingDetail record={selected} close={() => setSelected(null)} />
    <CreateOnboarding open={create} close={() => setCreate(false)} />
  </>
}

function OnboardingDetail({ record, close }: { record: OnboardingRecord | null; close: () => void }) {
  const client = useQueryClient()
  const mutation = useMutation({ mutationFn: ({ id, completed }: { id: string; completed: boolean }) => api.patch(`/onboarding/${record!.id}/tasks/${id}`, { completed }), onSuccess: (_, variables) => { record!.tasks = record!.tasks.map(task => task.id === variables.id ? { ...task, completed: variables.completed } : task); toast.success('Task updated'); client.invalidateQueries({ queryKey: ['onboarding'] }) }, onError: error => toast.error(messageFromError(error)) })
  return <Modal open={!!record} onClose={close} title={record ? `${employeeName(record.employee)} onboarding` : 'Onboarding'} wide>{record && <div className="space-y-3">{record.tasks.map(task => <label key={task.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-4"><input type="checkbox" className="size-5 accent-forest" checked={task.completed} onChange={event => mutation.mutate({ id: task.id, completed: event.target.checked })} /><span className={`flex-1 text-sm font-semibold ${task.completed ? 'text-black/35 line-through' : ''}`}>{task.title}</span>{task.dueDate && <span className="text-xs text-black/40">{formatDate(task.dueDate)}</span>}{task.completed && <Check className="size-4 text-emerald-600" />}</label>)}</div>}</Modal>
}

function CreateOnboarding({ open, close }: { open: boolean; close: () => void }) {
  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const client = useQueryClient()
  const employees = useQuery({ queryKey: ['employees', 'options'], enabled: open, queryFn: () => api.get<Paginated<Employee> | Employee[]>('/employees', { params: { status: 'active' } }).then(r => getList(r.data)) })
  const mutation = useMutation({ mutationFn: () => api.post('/onboarding', { employeeId, startDate }), onSuccess: () => { toast.success('Onboarding started'); client.invalidateQueries({ queryKey: ['onboarding'] }); close() }, onError: error => toast.error(messageFromError(error)) })
  return <Modal open={open} onClose={close} title="Start onboarding"><form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate() }}><div><label className="label">Employee</label><select required className="field" value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">Select employee</option>{employees.data?.map(item => <option key={item.id} value={item.id}>{employeeName(item)}</option>)}</select></div><div><label className="label">Start date</label><input required type="date" className="field" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><button className="btn-primary w-full" disabled={mutation.isPending}>Start onboarding</button></form></Modal>
}
