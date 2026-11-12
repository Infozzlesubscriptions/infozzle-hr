import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api, messageFromError } from '../lib/api'
import type { CalendarEvent } from '../lib/types'
import { ConfirmDialog, ErrorState, FieldError, formatDate, Modal, PageHeader, Spinner } from '../components/ui'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../lib/auth'

const schema = z.object({ title: z.string().min(1, 'Required'), date: z.string().min(1, 'Required'), endDate: z.string().optional(), description: z.string().optional() })
type Values = z.infer<typeof schema>

export function CalendarPage() {
  const [range, setRange] = useState({ start: '', end: '' })
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [newDate, setNewDate] = useState<string | null>(null)
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['calendar', range], enabled: !!range.start, queryFn: () => api.get<CalendarEvent[]>('/calendar/events', { params: range }).then(r => r.data) })
  const clickDate = (arg: DateClickArg) => { if (user?.role === 'HR') setNewDate(arg.dateStr) }
  const clickEvent = (arg: EventClickArg) => setSelected({ id: arg.event.id, title: arg.event.title, start: arg.event.startStr, end: arg.event.endStr || undefined, allDay: arg.event.allDay, ...arg.event.extendedProps } as CalendarEvent)
  return <><PageHeader eyebrow="Shared rhythm" title="Company calendar" description="Leave, remote work, onboarding milestones, and company holidays in one view." />
    <div className="card p-3 sm:p-6">{query.isError ? <ErrorState message={messageFromError(query.error)} retry={() => query.refetch()} /> : <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} initialView="dayGridMonth" headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,dayGridYear' }} views={{ dayGridYear: { type: 'dayGrid', duration: { years: 1 }, buttonText: 'year' } }} events={query.data || []} datesSet={arg => setRange({ start: arg.startStr, end: arg.endStr })} dateClick={clickDate} eventClick={clickEvent} height="auto" dayMaxEvents nowIndicator selectable={user?.role === 'HR'} />}{query.isLoading && <Spinner label="Loading calendar..." />}</div>
    <EventDetail event={selected} close={() => setSelected(null)} canDelete={user?.role === 'HR'} />
    <HolidayForm date={newDate} close={() => setNewDate(null)} />
  </>
}

function HolidayForm({ date, close }: { date: string | null; close: () => void }) {
  const client = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), values: { title: '', date: date || '', endDate: '', description: '' } })
  const mutation = useMutation({ mutationFn: (values: Values) => api.post('/calendar/holidays', values), onSuccess: () => { toast.success('Holiday added'); client.invalidateQueries({ queryKey: ['calendar'] }); close() }, onError: error => toast.error(messageFromError(error)) })
  return <Modal open={!!date} onClose={close} title="Add company holiday"><form className="space-y-4" onSubmit={handleSubmit(values => mutation.mutate(values))}><div><label className="label">Holiday name</label><input className="field" {...register('title')} /><FieldError message={errors.title?.message} /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Date</label><input type="date" className="field" {...register('date')} /></div><div><label className="label">End date</label><input type="date" className="field" {...register('endDate')} /></div></div><div><label className="label">Description</label><textarea className="field min-h-20 py-3" {...register('description')} /></div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={mutation.isPending}>Add holiday</button></div></form></Modal>
}

function EventDetail({ event, close, canDelete }: { event: CalendarEvent | null; close: () => void; canDelete: boolean }) {
  const [confirm, setConfirm] = useState(false)
  const client = useQueryClient()
  const remove = useMutation({ mutationFn: () => api.delete(`/calendar/holidays/${event!.id}`), onSuccess: () => { toast.success('Holiday removed'); client.invalidateQueries({ queryKey: ['calendar'] }); setConfirm(false); close() }, onError: error => toast.error(messageFromError(error)) })
  return <><Modal open={!!event} onClose={close} title={event?.title || 'Event'}>{event && <div><span className="pill bg-mint text-forest">{event.type || 'Calendar event'}</span><p className="mt-5 text-sm font-semibold">{formatDate(event.start)}{event.end && ` – ${formatDate(event.end)}`}</p>{event.description && <p className="mt-3 text-sm leading-6 text-black/60">{event.description}</p>}{canDelete && event.type === 'holiday' && <button className="btn-danger mt-6" onClick={() => setConfirm(true)}>Delete holiday</button>}</div>}</Modal><ConfirmDialog open={confirm} title="Delete holiday?" message="This removes the holiday from the company calendar." dangerous confirmLabel="Delete" busy={remove.isPending} onClose={() => setConfirm(false)} onConfirm={() => remove.mutate()} /></>
}
