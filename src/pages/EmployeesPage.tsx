import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, Pencil, Plus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { api, messageFromError } from '../lib/api'
import type { Department, Employee, Paginated } from '../lib/types'
import { employeeName, getList } from '../lib/types'
import { DataTable, type Column } from '../components/DataTable'
import { ErrorState, FieldError, formatDate, Modal, PageHeader, SearchField, Spinner, StatusBadge } from '../components/ui'

const schema = z.object({ firstName: z.string().min(1, 'Required'), lastName: z.string().min(1, 'Required'), email: z.string().email(), phone: z.string().optional(), departmentId: z.string().min(1, 'Select a department'), designation: z.string().min(1, 'Required'), joiningDate: z.string().min(1, 'Required'), status: z.enum(['active', 'inactive']) })
type Values = z.infer<typeof schema>

export function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Employee | null | undefined>(undefined)
  const [viewing, setViewing] = useState<Employee | null>(null)
  const deferredSearch = useDeferredValue(search)
  const query = useQuery({ queryKey: ['employees', deferredSearch, department, status], queryFn: () => api.get<Paginated<Employee> | Employee[]>('/employees', { params: { search: deferredSearch || undefined, department: department || undefined, status: status || undefined } }).then(r => getList(r.data)) })
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api.get<Paginated<Department> | Department[]>('/departments').then(r => getList(r.data)) })
  const columns: Column<Employee>[] = [
    { key: 'person', header: 'Employee', render: row => <div><button onClick={() => setViewing(row)} className="font-semibold hover:text-forest hover:underline">{employeeName(row)}</button><p className="text-xs text-black/45">{row.email}</p></div> },
    { key: 'id', header: 'ID', render: row => row.employeeId || '—' }, { key: 'department', header: 'Department', render: row => typeof row.department === 'string' ? row.department : row.department?.name || '—' },
    { key: 'role', header: 'Designation', render: row => row.designation || '—' }, { key: 'joined', header: 'Joined', render: row => formatDate(row.joiningDate) }, { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', className: 'text-right', render: row => <div className="flex justify-end gap-1"><button aria-label={`View ${employeeName(row)}`} className="rounded-lg p-2 hover:bg-black/5" onClick={() => setViewing(row)}><Eye className="size-4" /></button><button aria-label={`Edit ${employeeName(row)}`} className="rounded-lg p-2 hover:bg-black/5" onClick={() => setEditing(row)}><Pencil className="size-4" /></button></div> },
  ]
  return <><PageHeader eyebrow="Directory" title="Employees" description="The source of truth for everyone in your organization." actions={<button className="btn-primary" onClick={() => setEditing(null)}><Plus className="size-4" /> Add employee</button>} />
    <div className="card mb-4 grid gap-3 p-4 md:grid-cols-[1fr_220px_180px]"><SearchField value={search} onChange={setSearch} placeholder="Search name, email, or ID" /><select className="field" aria-label="Filter department" value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{departments.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="field" aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    <div className="card">{query.isLoading ? <Spinner label="Loading employees..." /> : query.isError ? <div className="p-4"><ErrorState message={messageFromError(query.error)} retry={() => query.refetch()} /></div> : <DataTable rows={query.data || []} columns={columns} keyOf={row => row.id} />}</div>
    <EmployeeForm employee={editing} departments={departments.data || []} onClose={() => setEditing(undefined)} />
    <EmployeeDetail employee={viewing} onClose={() => setViewing(null)} />
  </>
}

function EmployeeForm({ employee, departments, onClose }: { employee: Employee | null | undefined; departments: Department[]; onClose: () => void }) {
  const client = useQueryClient()
  const open = employee !== undefined
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), values: employee ? { firstName: employee.firstName, lastName: employee.lastName, email: employee.email, phone: employee.phone || '', departmentId: typeof employee.department === 'string' ? '' : employee.department?.id || '', designation: employee.designation || '', joiningDate: employee.joiningDate?.slice(0, 10) || '', status: employee.status === 'inactive' ? 'inactive' : 'active' } : { firstName: '', lastName: '', email: '', phone: '', departmentId: '', designation: '', joiningDate: '', status: 'active' } })
  const mutation = useMutation({ mutationFn: (values: Values) => employee ? api.patch(`/employees/${employee.id}`, values) : api.post('/employees', values), onSuccess: () => { toast.success(employee ? 'Employee updated' : 'Employee added'); client.invalidateQueries({ queryKey: ['employees'] }); reset(); onClose() }, onError: error => toast.error(messageFromError(error)) })
  return <Modal open={open} onClose={onClose} title={employee ? 'Edit employee' : 'Add employee'} wide><form onSubmit={handleSubmit(values => mutation.mutate(values))} className="grid gap-4 sm:grid-cols-2">
    <Input label="First name" error={errors.firstName?.message} input={register('firstName')} /><Input label="Last name" error={errors.lastName?.message} input={register('lastName')} /><Input label="Work email" type="email" error={errors.email?.message} input={register('email')} /><Input label="Phone" error={errors.phone?.message} input={register('phone')} />
    <div><label className="label">Department</label><select className="field" {...register('departmentId')}><option value="">Select department</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError message={errors.departmentId?.message} /></div>
    <Input label="Designation" error={errors.designation?.message} input={register('designation')} /><Input label="Joining date" type="date" error={errors.joiningDate?.message} input={register('joiningDate')} /><div><label className="label">Status</label><select className="field" {...register('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    <div className="mt-3 flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save employee'}</button></div>
  </form></Modal>
}

function Input({ label, type = 'text', error, input }: { label: string; type?: string; error?: string; input: ReturnType<ReturnType<typeof useForm<Values>>['register']> }) { return <div><label className="label">{label}</label><input type={type} className="field" {...input} /><FieldError message={error} /></div> }

function EmployeeDetail({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const [tab, setTab] = useState('profile')
  const detail = useQuery({ queryKey: ['employee', employee?.id, tab], enabled: !!employee, queryFn: () => api.get(`/employees/${employee!.id}/${tab === 'profile' ? '' : tab}`).then(r => r.data) })
  return <Modal open={!!employee} onClose={onClose} title={employee ? employeeName(employee) : 'Employee'} wide><div className="mb-5 flex gap-1 overflow-x-auto border-b border-black/8">{['profile', 'leave', 'wfh', 'documents'].map(item => <button key={item} className={`px-4 py-2.5 text-sm font-semibold capitalize ${tab === item ? 'border-b-2 border-forest text-forest' : 'text-black/45'}`} onClick={() => setTab(item)}>{item}</button>)}</div>{detail.isLoading ? <Spinner /> : detail.isError ? <ErrorState message={messageFromError(detail.error)} retry={() => detail.refetch()} /> : tab === 'profile' && employee ? <dl className="grid gap-5 sm:grid-cols-2">{[['Email', employee.email], ['Phone', employee.phone || '—'], ['Department', typeof employee.department === 'string' ? employee.department : employee.department?.name || '—'], ['Designation', employee.designation || '—'], ['Joining date', formatDate(employee.joiningDate)], ['Status', employee.status]].map(([term, value]) => <div key={term}><dt className="label">{term}</dt><dd className="text-sm font-semibold">{value}</dd></div>)}</dl> : <pre className="overflow-auto rounded-xl bg-white p-4 text-xs">{JSON.stringify(detail.data, null, 2)}</pre>}</Modal>
}
